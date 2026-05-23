import type { AdminRole } from "../types/app";

export function normalizeAdminRole(role?: string): AdminRole {
  const normalized = String(role || "").trim().toLowerCase();

  if (normalized === "desenvolvedor" || normalized === "developer") return "desenvolvedor";
  if (normalized === "dono" || normalized === "owner") return "dono";
  if (normalized === "funcionario" || normalized === "funcionário" || normalized === "staff") return "funcionario";

  return "funcionario";
}

export function canManageBilling(role?: string) {
  const normalized = normalizeAdminRole(role);
  return normalized === "desenvolvedor" || normalized === "dono";
}

export function canManagePlatform(role?: string) {
  return normalizeAdminRole(role) === "desenvolvedor";
}
