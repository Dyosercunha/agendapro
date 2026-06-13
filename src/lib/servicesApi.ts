import { callAdminRpc } from "./apiCore";

export function saveServices(payload: Record<string, unknown>) {
  return callAdminRpc("save_services", payload);
}

export function softDeleteService(payload: Record<string, unknown>) {
  return callAdminRpc("soft_delete_service", payload);
}
