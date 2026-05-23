import { callRpcWithRestFallback, fetchJson, postJson } from "./apiCore";

export function getAdminAppointments(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("get_admin_appointments", payload);
}

export function bookAppointmentV2(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("book_appointment_v2", payload);
}

export function bookAppointmentLegacy(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("book_appointment", payload);
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
  return callRpcWithRestFallback("update_appointment_action", payload);
}

export function joinWaitlist(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("join_waitlist", payload);
}

export function updateWaitlistStatus(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("update_waitlist_status", payload);
}

export function getWhatsappStatus() {
  return fetchJson("/api/send-whatsapp?status=1");
}

export function sendWhatsappMessage(payload: Record<string, unknown>) {
  return postJson("/api/send-whatsapp", payload);
}
