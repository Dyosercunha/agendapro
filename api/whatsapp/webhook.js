import { getAdminClient, responseError, whatsappEnv } from "../whatsapp-core.js";

function statusTimestamp(status) {
  const timestamp = Number(status?.timestamp || 0);
  if (!timestamp) return new Date().toISOString();
  return new Date(timestamp * 1000).toISOString();
}

async function updateMessageStatus(adminClient, status) {
  const messageId = status?.id;
  const nextStatus = status?.status;

  if (!messageId || !nextStatus) return;

  const update = {
    status: nextStatus,
  };

  const timestamp = statusTimestamp(status);

  if (nextStatus === "sent") update.sent_at = timestamp;
  if (nextStatus === "delivered") update.delivered_at = timestamp;
  if (nextStatus === "read") update.read_at = timestamp;
  if (nextStatus === "failed") {
    update.error_message =
      status?.errors?.[0]?.title ||
      status?.errors?.[0]?.message ||
      status?.errors?.[0]?.error_data?.details ||
      "Falha informada pelo WhatsApp.";
  }

  await adminClient
    .from("whatsapp_messages")
    .update(update)
    .eq("whatsapp_message_id", messageId);
}

async function logInboundMessage(adminClient, message, metadata) {
  if (!message?.id) return;

  const text =
    message?.text?.body ||
    message?.button?.text ||
    message?.interactive?.button_reply?.title ||
    message?.interactive?.list_reply?.title ||
    "";

  await adminClient
    .from("whatsapp_messages")
    .insert({
      to_phone: metadata?.display_phone_number || metadata?.phone_number_id || "agenda-pro",
      whatsapp_message_id: message.id,
      message_type: "inbound_message",
      status: "received",
      error_message: text ? `Mensagem recebida: ${text}` : "Mensagem recebida sem texto.",
      sent_at: statusTimestamp(message),
    });
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    const mode = request.query["hub.mode"];
    const token = request.query["hub.verify_token"];
    const challenge = request.query["hub.challenge"];
    const env = whatsappEnv();

    if (mode === "subscribe" && token && token === env.verifyToken) {
      return response.status(200).send(challenge);
    }

    return response.status(403).send("Token de verificação inválido.");
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST");
    return responseError(response, 405, "Método não permitido.");
  }

  const adminClient = getAdminClient();

  if (!adminClient) {
    return responseError(response, 501, "SUPABASE_SERVICE_ROLE_KEY não configurada.");
  }

  const payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];

    for (const change of changes) {
      const value = change.value || {};
      const statuses = Array.isArray(value.statuses) ? value.statuses : [];
      const messages = Array.isArray(value.messages) ? value.messages : [];

      for (const status of statuses) {
        await updateMessageStatus(adminClient, status);
      }

      for (const message of messages) {
        await logInboundMessage(adminClient, message, value.metadata);
      }
    }
  }

  return response.status(200).json({ ok: true });
}
