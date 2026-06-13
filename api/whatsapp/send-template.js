import {
  getAdminClient,
  logWhatsappMessage,
  normalizeBrazilPhone,
  responseError,
  sendMetaTemplate,
  whatsappEnv,
  whatsappProviderStatus,
} from "../whatsapp-core.js";

function formatBrazilDate(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function shortTime(value) {
  return String(value || "").slice(0, 5) || "-";
}

function publicManageLink(request, shopSlug, token) {
  const origin =
    process.env.PUBLIC_APP_URL ||
    process.env.VITE_PUBLIC_APP_URL ||
    `https://${request.headers.host || "calendarproapp.vercel.app"}`;

  return `${origin.replace(/\/$/, "")}/agendamento/${shopSlug}?agendamento=${encodeURIComponent(token || "")}`;
}

async function loadAppointment(adminClient, payload) {
  const slug = String(payload.barbershopSlug || payload.slug || "").trim();
  const appointmentId = String(payload.appointmentId || payload.appointment_id || "").trim();
  const publicToken = String(payload.publicToken || payload.public_token || "").trim();

  if (!slug || !appointmentId) {
    return {
      ok: false,
      status: 400,
      error: "Informe barbershopSlug e appointmentId.",
    };
  }

  let query = adminClient
    .from("appointments")
    .select(`
      id,
      barbershop_id,
      client_id,
      professional_id,
      client_name,
      whatsapp,
      service_text,
      appointment_date,
      appointment_time,
      duration,
      total,
      payment_method,
      paid,
      status,
      customer_note,
      public_token,
      barbershops!inner(id, slug, name, whatsapp, automatic_confirmation_enabled, archived_at),
      professionals(id, name)
    `)
    .eq("id", appointmentId)
    .eq("barbershops.slug", slug)
    .is("barbershops.archived_at", null)
    .neq("status", "cancelled");

  if (publicToken) {
    query = query.eq("public_token", publicToken);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return {
      ok: false,
      status: 404,
      error: "Agendamento não encontrado para envio de WhatsApp.",
      details: error?.message,
    };
  }

  if (!data.barbershops?.automatic_confirmation_enabled) {
    return {
      ok: false,
      status: 403,
      error: "Confirmação automática está desativada para esta barbearia.",
    };
  }

  return { ok: true, appointment: data };
}

async function sendAndLog(adminClient, appointment, recipient, templateName, parameters, messageType) {
  const to = normalizeBrazilPhone(recipient);

  if (!to) {
    return {
      ok: false,
      status: 400,
      error: "Número de destino inválido.",
      messageType,
    };
  }

  const result = await sendMetaTemplate({
    to,
    templateName,
    parameters,
  });

  const whatsappMessageId = result.data?.messages?.[0]?.id || null;
  const sentAt = result.ok ? new Date().toISOString() : null;

  await logWhatsappMessage(adminClient, {
    appointmentId: appointment.id,
    barbershopId: appointment.barbershop_id,
    customerId: appointment.client_id,
    toPhone: to,
    templateName,
    messageType,
    whatsappMessageId,
    status: result.ok ? "sent" : "failed",
    errorMessage: result.ok ? "" : result.error || "Falha no envio",
    sentAt,
  });

  return {
    ok: result.ok,
    status: result.status || (result.ok ? 200 : 500),
    error: result.error,
    details: result.details,
    messageType,
    whatsappMessageId,
  };
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return response.status(200).json({
      ok: true,
      ...whatsappProviderStatus(),
    });
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
  const appointmentResult = await loadAppointment(adminClient, payload);

  if (!appointmentResult.ok) {
    return responseError(response, appointmentResult.status, appointmentResult.error, {
      details: appointmentResult.details,
    });
  }

  const appointment = appointmentResult.appointment;
  const shop = appointment.barbershops;
  const env = whatsappEnv();
  const manageLink = publicManageLink(request, shop.slug, appointment.public_token);
  const professionalName = appointment.professionals?.name || "Profissional disponível";
  const dateText = formatBrazilDate(appointment.appointment_date);
  const timeText = shortTime(appointment.appointment_time);
  const note = appointment.customer_note || "Sem observação";
  const paymentText = appointment.paid
    ? `Pago (${appointment.payment_method || "local"})`
    : `Pendente (${appointment.payment_method || "local"})`;

  const customerParameters = [
    appointment.client_name,
    shop.name,
    appointment.service_text,
    dateText,
    timeText,
    professionalName,
  ];

  const shopParameters = [
    appointment.client_name,
    appointment.whatsapp,
    appointment.service_text,
    dateText,
    timeText,
    professionalName,
    `${note} | Pagamento: ${paymentText}`,
  ];

  const requestedTarget = String(payload.target || "both").toLowerCase();
  const results = [];

  if (requestedTarget === "both" || requestedTarget === "customer") {
    results.push(
      await sendAndLog(
        adminClient,
        appointment,
        appointment.whatsapp,
        env.customerTemplate,
        customerParameters,
        "appointment_customer_confirmation"
      )
    );
  }

  if (requestedTarget === "both" || requestedTarget === "shop") {
    results.push(
      await sendAndLog(
        adminClient,
        appointment,
        shop.whatsapp,
        env.shopTemplate,
        shopParameters,
        "appointment_shop_confirmation"
      )
    );
  }

  const customerSent = results.some((item) => item.messageType === "appointment_customer_confirmation" && item.ok);
  const shopSent = results.some((item) => item.messageType === "appointment_shop_confirmation" && item.ok);

  if (customerSent || shopSent) {
    await adminClient
      .from("appointments")
      .update({
        whatsapp_customer_sent: customerSent || undefined,
        whatsapp_shop_sent: shopSent || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", appointment.id);
  }

  return response.status(results.every((item) => item.ok) ? 200 : 207).json({
    ok: results.some((item) => item.ok),
    manageLink,
    sent: {
      customer: customerSent,
      shop: shopSent,
    },
    results,
  });
}
