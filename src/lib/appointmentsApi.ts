import {
  apiErrorText,
  apiResultError,
  callAdminRpc,
  callRpcWithRestFallback,
  fetchJson,
  getSessionToken,
  postJson,
} from "./apiCore";

function shouldSkipAdminRpcFallback(error: unknown) {
  const message = apiErrorText(error).toLowerCase();

  return (
    message.includes("sess") ||
    message.includes("session") ||
    message.includes("login") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("401") ||
    message.includes("403") ||
    message.includes("permission denied") ||
    message.includes("acesso restrito")
  );
}

export async function getAdminAppointments(payload: Record<string, unknown>) {
  let token = "";

  try {
    token = await getSessionToken();
  } catch (authError) {
    return apiResultError(
      "Entre no painel da barbearia para carregar os agendamentos administrativos.",
      { code: "AUTH_SESSION_REQUIRED", details: apiErrorText(authError) }
    );
  }

  try {
    const response = (await postJson("/api/admin-appointments", payload, token)) as {
      appointments?: unknown[];
    };

    return { data: response.appointments || [], error: null };
  } catch (backendError) {
    if (shouldSkipAdminRpcFallback(backendError)) {
      return apiResultError(
        "Entre no painel da barbearia para carregar os agendamentos administrativos.",
        { code: "ADMIN_APPOINTMENTS_AUTH_REQUIRED", details: apiErrorText(backendError) }
      );
    }

    const result = await callAdminRpc("get_admin_appointments", payload);

    if (!result.error) return result;

    return { data: null, error: backendError || result.error };
  }
}

export function bookAppointmentV2(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("book_appointment_v2", payload);
}

export function bookAppointmentLegacy(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("book_appointment", payload);
}

export function checkPublicSlotAvailability(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("check_public_slot_availability", payload);
}

export function getPublicAppointment(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("get_public_appointment", payload);
}

export function cancelPublicAppointment(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("cancel_appointment_public", payload);
}

export function requestPublicReschedule(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("request_appointment_reschedule", payload);
}

export function updateAppointmentAction(payload: Record<string, unknown>) {
  return callAdminRpc("update_appointment_action", payload);
}

export function joinWaitlist(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("join_waitlist", payload);
}

export function updateWaitlistStatus(payload: Record<string, unknown>) {
  return callAdminRpc("update_waitlist_status", payload);
}

export function getWhatsappStatus() {
  return fetchJson("/api/send-whatsapp?status=1");
}

export function sendWhatsappMessage(payload: Record<string, unknown>) {
  return postJson("/api/send-whatsapp", payload);
}

export function sendWhatsappAppointmentTemplates(payload: Record<string, unknown>) {
  return postJson("/api/whatsapp/send-template", payload);
}
