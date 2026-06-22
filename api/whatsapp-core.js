import { createClient } from "@supabase/supabase-js";

export const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

export const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

export function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeBrazilPhone(value = "") {
  let digits = onlyDigits(value);

  while (digits.startsWith("0")) digits = digits.slice(1);

  if (digits.startsWith("550")) digits = `55${digits.slice(3)}`;

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;

  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
}

export function getAdminClient() {
  if (!serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export function whatsappEnv() {
  const provider = String(process.env.WHATSAPP_PROVIDER || "meta").toLowerCase();
  const token = process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_TOKEN || "";
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || "";
  const graphVersion = process.env.WHATSAPP_GRAPH_VERSION || "v20.0";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";

  return {
    provider,
    token,
    phoneNumberId,
    graphVersion,
    verifyToken,
    customerTemplate:
      process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CUSTOMER ||
      "agendamento_confirmado_cliente",
    shopTemplate:
      process.env.WHATSAPP_TEMPLATE_APPOINTMENT_SHOP ||
      "novo_agendamento_barbearia",
    cancelledTemplate:
      process.env.WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED ||
      "agendamento_cancelado",
    rescheduledTemplate:
      process.env.WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED ||
      "agendamento_reagendado",
    reminderTemplate:
      process.env.WHATSAPP_TEMPLATE_APPOINTMENT_REMINDER ||
      "lembrete_agendamento",
    languageCode: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR",
  };
}

export function whatsappProviderStatus() {
  const env = whatsappEnv();
  const serviceRoleConfigured = Boolean(serviceRoleKey);
  const metaConfigured = Boolean(env.token && env.phoneNumberId);
  const mockConfigured = env.provider === "mock";
  const providerConfigured = mockConfigured || metaConfigured;
  const providerLabel = mockConfigured ? "Simulação local" : "WhatsApp Cloud API";

  return {
    provider: env.provider,
    providerLabel,
    serviceRoleConfigured,
    providerConfigured,
    ready: serviceRoleConfigured && providerConfigured,
    missing: [
      !serviceRoleConfigured ? "SUPABASE_SERVICE_ROLE_KEY" : "",
      !mockConfigured && !env.token ? "WHATSAPP_ACCESS_TOKEN ou WHATSAPP_TOKEN" : "",
      !mockConfigured && !env.phoneNumberId ? "WHATSAPP_PHONE_NUMBER_ID" : "",
    ].filter(Boolean),
  };
}

export function textParameter(value = "") {
  return {
    type: "text",
    text: String(value || "-").slice(0, 1024),
  };
}

export function templatePayload(to, templateName, parameters = [], languageCode = "pt_BR") {
  return {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: "body",
          parameters: parameters.map(textParameter),
        },
      ],
    },
  };
}

export async function sendMetaTemplate({ to, templateName, parameters }) {
  const env = whatsappEnv();

  if (env.provider === "mock") {
    return {
      ok: true,
      provider: "mock",
      data: {
        messages: [{ id: `mock-${Date.now()}` }],
        template: templateName,
        to,
        parameters,
      },
    };
  }

  if (!env.token || !env.phoneNumberId) {
    return {
      ok: false,
      status: 501,
      error:
        "WhatsApp Cloud API ainda não configurado. Cadastre WHATSAPP_ACCESS_TOKEN e WHATSAPP_PHONE_NUMBER_ID no Vercel.",
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/${env.graphVersion}/${env.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload(to, templateName, parameters, env.languageCode)),
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: data?.error?.message || "Falha ao enviar template do WhatsApp.",
      details: data,
    };
  }

  return { ok: true, provider: "meta", data };
}

export async function logWhatsappMessage(adminClient, record) {
  if (!adminClient) return null;

  const payload = {
    appointment_id: record.appointmentId || null,
    barbershop_id: record.barbershopId || null,
    customer_id: record.customerId || null,
    to_phone: record.toPhone,
    template_name: record.templateName || null,
    message_type: record.messageType || null,
    whatsapp_message_id: record.whatsappMessageId || null,
    status: record.status || "queued",
    error_message: record.errorMessage || null,
    sent_at: record.sentAt || null,
  };

  const { data, error } = await adminClient
    .from("whatsapp_messages")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Falha ao registrar mensagem WhatsApp:", error);
    return null;
  }

  return data;
}

export function responseError(response, status, error, extra = {}) {
  return response.status(status).json({
    ok: false,
    error,
    ...extra,
  });
}
