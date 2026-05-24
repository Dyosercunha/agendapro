import type { PlanKey, PlanOption, SubscriptionStatus } from "../types/app";

export const planOptions: PlanOption[] = [
  {
    id: "starter" as PlanKey,
    name: "Inicial",
    price: "R$ 49/mês",
    priceValue: 49,
    description: "Agenda online, serviços, profissionais, link do cliente e painel básico.",
    features: [
      "Agenda online",
      "Serviços",
      "Profissionais",
      "Link do cliente",
      "Painel básico",
    ],
  },
  {
    id: "professional" as PlanKey,
    name: "Profissional",
    price: "R$ 89/mês",
    priceValue: 89,
    description: "Tudo do Inicial, com aparência personalizada, PIX, clientes e promoções simples.",
    features: [
      "Tudo do Inicial",
      "Aparência personalizada",
      "PIX",
      "Confirmação WhatsApp",
      "Clientes",
      "Promoções simples",
    ],
  },
  {
    id: "premium" as PlanKey,
    name: "Premium",
    price: "R$ 149/mês",
    priceValue: 149,
    description: "Tudo do Profissional, com fidelidade, lista de espera, Instagram e relatórios.",
    features: [
      "Tudo do Profissional",
      "Fidelidade",
      "Lista de espera",
      "Fotos Antes/Processo/Finalizado",
      "Instagram",
      "Login Google cliente",
      "Relatórios",
    ],
  },
];

export const planLabels = Object.fromEntries(planOptions.map((plan) => [plan.id, plan.name])) as Record<
  PlanKey,
  string
>;

export const planPrices = Object.fromEntries(planOptions.map((plan) => [plan.id, plan.priceValue])) as Record<
  PlanKey,
  number
>;

export const statusOptions: Array<{ label: string; value: SubscriptionStatus }> = [
  { value: "trial", label: "Teste 30 dias" },
  { value: "active", label: "Ativo" },
  { value: "overdue", label: "Atrasado" },
  { value: "blocked", label: "Bloqueado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "archived", label: "Arquivado" },
];

export const monthlyStatusLabels: Record<SubscriptionStatus | "pending", string> = {
  active: "Ativa",
  trial: "Em teste",
  pending: "Pagamento pendente",
  overdue: "Atrasada",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
  archived: "Arquivada",
};

export function planLabel(plan?: string) {
  return planLabels[plan as PlanKey] || plan || "Sem plano";
}

export function planPriceFor(plan?: string) {
  return planPrices[plan as PlanKey] || planPrices.professional;
}

export function statusLabel(status?: string) {
  if (status === "pending") return monthlyStatusLabels.pending;
  return statusOptions.find((item) => item.value === status)?.label || "Ativo";
}

export function blocksClientScheduling(status?: string) {
  return ["blocked", "cancelled", "archived"].includes(String(status || "").toLowerCase());
}
