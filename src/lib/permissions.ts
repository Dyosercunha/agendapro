import type { AdminRole } from "../types/app";

export const adminTabIds = [
  "dashboard",
  "agendaToday",
  "agenda",
  "agendaPremium",
  "customers",
  "services",
  "professionals",
  "payments",
  "appearance",
  "improvements",
  "account",
] as const;

export type AdminTabId = (typeof adminTabIds)[number];

const employeeTabs: AdminTabId[] = ["dashboard", "agendaToday", "agenda", "customers"];

export const permissionRules: Record<AdminRole, AdminTabId[]> = {
  desenvolvedor: [...adminTabIds],
  dono: [...adminTabIds],
  funcionario: employeeTabs,
};

export function normalizeAdminRole(role?: string): AdminRole {
  const normalized = String(role || "").trim().toLowerCase();

  if (["desenvolvedor", "developer", "platform", "plataforma"].includes(normalized)) {
    return "desenvolvedor";
  }

  if (["dono", "owner"].includes(normalized)) {
    return "dono";
  }

  if (["funcionario", "funcionário", "staff", "manager"].includes(normalized)) {
    return "funcionario";
  }

  return "funcionario";
}

export function canAccessAdminTab(role?: string, tabId?: string, isOwnerEmail = false) {
  const normalized = normalizeAdminRole(role);

  if (normalized === "desenvolvedor") return true;
  if (normalized === "dono" || isOwnerEmail) return true;

  return employeeTabs.includes(tabId as AdminTabId);
}

export function getVisibleAdminTabs<T extends { id: string }>(
  tabs: T[],
  role?: string,
  isOwnerEmail = false
) {
  return tabs.filter((tab) => canAccessAdminTab(role, tab.id, isOwnerEmail));
}

export function canManageBilling(role?: string) {
  return normalizeAdminRole(role) === "desenvolvedor";
}

export function canManageBusinessSettings(role?: string, isOwnerEmail = false) {
  const normalized = normalizeAdminRole(role);
  return normalized === "desenvolvedor" || normalized === "dono" || isOwnerEmail;
}

export function canManageAccessAccounts(role?: string, isOwnerEmail = false) {
  return canManageBusinessSettings(role, isOwnerEmail);
}

export function canManagePlatform(role?: string) {
  return normalizeAdminRole(role) === "desenvolvedor";
}

export function permissionScenarioMatrix() {
  return [
    {
      role: "desenvolvedor" as AdminRole,
      label: "Desenvolvedor",
      visibleTabs: permissionRules.desenvolvedor,
      canManageBilling: true,
      canManageFeatures: true,
      canManageSensitiveAccount: true,
    },
    {
      role: "dono" as AdminRole,
      label: "Dono",
      visibleTabs: permissionRules.dono,
      canManageBilling: false,
      canManageFeatures: true,
      canManageSensitiveAccount: true,
    },
    {
      role: "funcionario" as AdminRole,
      label: "Funcionário",
      visibleTabs: permissionRules.funcionario,
      canManageBilling: false,
      canManageFeatures: false,
      canManageSensitiveAccount: false,
    },
  ];
}
