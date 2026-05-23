import { callRpc, fetchJson, getSessionToken, postJson } from "./apiCore";

export function isPlatformAdmin() {
  return callRpc("is_platform_admin");
}

export function getPlatformDashboard() {
  return callRpc("get_platform_dashboard");
}

export function createBarbershopFull(payload: Record<string, unknown>) {
  return callRpc("create_barbershop_full", payload);
}

export function updatePlatformBarbershop(payload: Record<string, unknown>) {
  return callRpc("update_platform_barbershop", payload);
}

export function archivePlatformBarbershop(slug: string) {
  return callRpc("archive_platform_barbershop", { target_slug: slug });
}

export function purgeArchivedBarbershops() {
  return callRpc("purge_archived_barbershops");
}

export function savePlatformFeatureFlags(payload: Record<string, unknown>) {
  return callRpc("save_platform_feature_flags", payload);
}

export function getPlatformBillingReminders() {
  return callRpc("get_platform_billing_reminders");
}

export function markBillingReminderSent(slug: string) {
  return callRpc("mark_billing_reminder_sent", { target_slug: slug });
}

export async function callPlatformMaintenance(payload: Record<string, unknown>) {
  const token = await getSessionToken();
  return postJson("/api/platform-shop-maintenance", payload, token);
}

export function getDeployInfo() {
  return fetchJson("/api/deploy-info");
}
