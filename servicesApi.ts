import { callRpcWithRestFallback } from "./apiCore";

export function saveServices(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_services", payload);
}

export function softDeleteService(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("soft_delete_service", payload);
}
