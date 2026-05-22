import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

function normalizeBrazilPhone(value = "") {
  let digits = onlyDigits(value);

  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

function errorResponse(response, status, error, extra = {}) {
  return response.status(status).json({
    ok: false,
    error,
    ...extra,
  });
}

function getAdminClient() {
  if (!serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function whatsappProviderStatus() {
  const provider = String(process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  const serviceRoleConfigured = Boolean(serviceRoleKey);
  const metaConfigured = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  const webhookConfigured = Boolean(process.env.WHATSAPP_WEBHOOK_URL);
  const providerConfigured = provider === "webhook" ? webhookConfigured : metaConfigured;
  const providerLabel = provider === "webhook" ? "Webhook externo" : "WhatsApp Cloud API";

  return {
    provider,
    providerLabel,
    serviceRoleConfigured,
    providerConfigured,
    ready: serviceRoleConfigured && providerConfigured,
    missing: [
      !serviceRoleConfigured ? "SUPABASE_SERVICE_ROLE_KEY" : "",
      provider === "webhook" && !webhookConfigured ? "WHATSAPP_WEBHOOK_URL" : "",
      provider !== "webhook" && !process.env.WHATSAPP_TOKEN ? "WHATSAPP_TOKEN" : "",
      provider !== "webhook" && !process.env.WHATSAPP_PHONE_NUMBER_ID ? "WHATSAPP_PHONE_NUMBER_ID" : "",
    ].filter(Boolean),
  };
}

async function validateBarbershopDestination(payload, response) {
  const slug = String(payload.barbershopSlug || payload.slug || "").trim();
  const adminClient = getAdminClient();

  if (!adminClient) {
    return {
      ok: false,
      status: 501,
      error:
        "WhatsApp automático precisa do SUPABASE_SERVICE_ROLE_KEY no Vercel para validar a barbearia.",
    };
  }

  if (!slug) {
    return {
      ok: false,
      status: 400,
      error: "Informe a barbearia para enviar a confirmação.",
    };
  }

  const { data: shop, error } = await adminClient
    .from("barbershops")
    .select("slug, name, whatsapp, automatic_confirmation_enabled")
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();

  if (error || !shop) {
    return {
      ok: false,
      status: 404,
      error: "Barbearia não encontrada para envio do WhatsApp.",
      details: error?.message,
    };
  }

  if (!shop.automatic_confirmation_enabled) {
    return {
      ok: false,
      status: 403,
      error: "Confirmação automática desativada para esta barbearia.",
    };
  }

  const requestedTo = normalizeBrazilPhone(payload.to);
  const registeredTo = normalizeBrazilPhone(shop.whatsapp);

  if (!requestedTo || requestedTo !== registeredTo) {
    return {
      ok: false,
      status: 403,
      error: "Número de destino diferente do WhatsApp cadastrado na barbearia.",
    };
  }

  return {
    ok: true,
    to: registeredTo,
    shop,
  };
}

async function sendWithMetaCloud(to, body) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";

  if (!token || !phoneNumberId) {
    return {
      ok: false,
      status: 501,
      error:
        "WhatsApp Cloud API ainda não configurado. Cadastre WHATSAPP_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Vercel.",
    };
  }

  const whatsappResponse = await fetch(
    `https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body,
        },
      }),
    }
  );

  const data = await whatsappResponse.json().catch(() => ({}));

  if (!whatsappResponse.ok) {
    return {
      ok: false,
      status: whatsappResponse.status,
      error: data?.error?.message || "Falha ao enviar WhatsApp.",
      details: data,
    };
  }

  return { ok: true, data };
}

async function sendWithWebhook(to, body) {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  const webhookToken = process.env.WHATSAPP_WEBHOOK_TOKEN;

  if (!webhookUrl) {
    return {
      ok: false,
      status: 501,
      error: "Webhook de WhatsApp não configurado. Cadastre WHATSAPP_WEBHOOK_URL no Vercel.",
    };
  }

  const webhookResponse = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(webhookToken ? { Authorization: `Bearer ${webhookToken}` } : {}),
    },
    body: JSON.stringify({ to, message: body }),
  });

  const data = await webhookResponse.json().catch(() => ({}));

  if (!webhookResponse.ok) {
    return {
      ok: false,
      status: webhookResponse.status,
      error: data?.error || data?.message || "Falha ao enviar WhatsApp pelo webhook.",
      details: data,
    };
  }

  return { ok: true, data };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return response.status(200).json({
      ok: true,
      ...whatsappProviderStatus(),
    });
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return errorResponse(response, 405, "Método não permitido.");
  }

  let payload = {};

  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    payload = {};
  }

  const body = String(payload.message || "").trim();

  if (!body) {
    return errorResponse(response, 400, "Informe a mensagem.");
  }

  const validation = await validateBarbershopDestination(payload, response);

  if (!validation.ok) {
    return errorResponse(response, validation.status, validation.error, {
      details: validation.details,
    });
  }

  const provider = String(process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  const result =
    provider === "webhook"
      ? await sendWithWebhook(validation.to, body)
      : await sendWithMetaCloud(validation.to, body);

  if (!result.ok) {
    return errorResponse(response, result.status || 500, result.error, {
      details: result.details,
    });
  }

  return response.status(200).json({
    ok: true,
    provider,
    data: result.data,
  });
}
