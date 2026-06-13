import type {
  FeatureDefinition,
  FeatureFlag,
  FeatureKey,
  PlanFeatureKey,
  PlanKey,
} from "../types/app";

export const canonicalFeatureKeys: FeatureKey[] = [
  "pix",
  "auto_confirmation",
  "service_delete",
  "backplate",
  "appearance_media",
  "promotions",
  "visual_agenda",
  "commissions",
  "waitlist",
  "loyalty",
  "google_login",
  "instagram_booking",
  "unique_link",
];

const featureKeyAliases: Record<string, FeatureKey> = {
  agenda_visual: "visual_agenda",
  carousel: "appearance_media",
  carrossel: "appearance_media",
  comissao: "commissions",
  comissoes: "commissions",
  commission: "commissions",
  google_client: "google_login",
  google_client_login: "google_login",
  instagram: "instagram_booking",
  instagram_booking_enabled: "instagram_booking",
  pro_google_client_enabled: "google_login",
  pro_instagram_enabled: "instagram_booking",
  reschedule_link: "unique_link",
  unique_reschedule_link: "unique_link",
  visual_schedule: "visual_agenda",
};

const planRank: Record<PlanKey, number> = {
  starter: 1,
  professional: 2,
  premium: 3,
};

export const featurePlanLabels: Record<PlanKey, string> = {
  starter: "Inicial",
  professional: "Profissional",
  premium: "Premium",
};

export function normalizePlanKey(value: string | undefined): PlanKey {
  const normalized = String(value || "starter").trim().toLowerCase();

  if (["premium", "advanced"].includes(normalized)) return "premium";
  if (["professional", "profissional", "pro"].includes(normalized)) return "professional";
  return "starter";
}

export function normalizeFeatureKey(value: string): FeatureKey | null {
  const normalized = String(value || "").trim().toLowerCase();

  if ((canonicalFeatureKeys as string[]).includes(normalized)) {
    return normalized as FeatureKey;
  }

  return featureKeyAliases[normalized] || null;
}

export function planMeetsFeaturePlan(plan: string | undefined, minPlan: PlanKey = "starter") {
  const currentPlan = normalizePlanKey(plan);
  return (planRank[currentPlan] || planRank.starter) >= planRank[minPlan];
}

export function featureMinimumPlanLabel(minPlan?: PlanKey) {
  return featurePlanLabels[minPlan || "starter"];
}

export function featureUpgradeLabel(plan?: string, minPlan?: PlanKey) {
  return planMeetsFeaturePlan(plan, minPlan) ? "" : `Upgrade para ${featureMinimumPlanLabel(minPlan)}`;
}

export const featurePlanFieldByKey: Partial<Record<FeatureKey, PlanFeatureKey>> = {
  appearance_media: "temas_personalizados",
  backplate: "temas_personalizados",
  commissions: "relatorio_financeiro",
  google_login: "historico_clientes",
  instagram_booking: "temas_personalizados",
  loyalty: "historico_clientes",
  promotions: "temas_personalizados",
  unique_link: "historico_clientes",
  visual_agenda: "relatorio_financeiro",
  waitlist: "historico_clientes",
};

export const platformFeatures: FeatureDefinition[] = [
  {
    key: "pix",
    title: "PIX antecipado",
    description: "Permite oferecer desconto para pagamento antecipado.",
    minPlan: "professional",
    released: true,
  },
  {
    key: "auto_confirmation",
    title: "Confirmação automática",
    description: "Envia os dados da confirmação para o WhatsApp da barbearia.",
    minPlan: "professional",
    released: true,
  },
  {
    key: "service_delete",
    title: "Excluir serviço seguro",
    description: "Remove serviços da vitrine sem apagar histórico ou agendamentos antigos.",
    minPlan: "professional",
    released: false,
  },
  {
    key: "backplate",
    title: "Plano de fundo personalizado",
    description: "Libera imagem de fundo para a tela do cliente e para o painel da barbearia.",
    minPlan: "professional",
    released: false,
  },
  {
    key: "appearance_media",
    title: "Carrossel Antes / Processo / Finalizado",
    description: "Mostra fotos de portfólio em carrossel na vitrine de agendamento do cliente.",
    minPlan: "professional",
    released: false,
  },
  {
    key: "promotions",
    title: "Promoções inteligentes",
    description: "Campanhas, preço promocional e descontos configuráveis para clientes.",
    minPlan: "professional",
    released: false,
  },
  {
    key: "visual_agenda",
    title: "Agenda visual",
    description: "Visão por dia e semana, status dos atendimentos, filtros por profissional e ações rápidas.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "commissions",
    title: "Comissões por profissional",
    description: "Percentuais por profissional, por serviço e relatório de valores pagos ou pendentes.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "waitlist",
    title: "Lista de espera",
    description: "O cliente entra na fila quando não houver horário disponível.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "loyalty",
    title: "Fidelidade",
    description: "Recompensas por quantidade de atendimentos ou valor gasto.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "google_login",
    title: "Login Google cliente",
    description: "Histórico completo do cliente com uma conta Google.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "instagram_booking",
    title: "Agendamento pelo Instagram",
    description: "Entrada rápida para agendar direto dos perfis sociais.",
    minPlan: "premium",
    released: false,
  },
  {
    key: "unique_link",
    title: "Link de remarcar/cancelar",
    description: "O cliente altera o próprio horário por um link único.",
    minPlan: "premium",
    released: false,
  },
];

export const featureLabels = Object.fromEntries(
  platformFeatures.map((feature) => [feature.key, feature.title])
) as Record<FeatureKey, string>;

export function defaultFeatureFlags() {
  return platformFeatures.reduce((result, feature) => {
    result[feature.key] = {
      enabled: feature.key === "pix" || feature.key === "auto_confirmation",
      released: feature.released,
    };

    return result;
  }, {} as Record<FeatureKey, FeatureFlag>);
}
