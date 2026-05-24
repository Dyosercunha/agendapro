import type { FeatureDefinition, FeatureFlag, FeatureKey } from "../types/app";

export const canonicalFeatureKeys: FeatureKey[] = [
  "pix",
  "auto_confirmation",
  "service_delete",
  "backplate",
  "appearance_media",
  "promotions",
  "waitlist",
  "loyalty",
  "google_login",
  "instagram_booking",
  "unique_link",
];

const featureKeyAliases: Record<string, FeatureKey> = {
  google_client: "google_login",
  google_client_login: "google_login",
  pro_google_client_enabled: "google_login",
  instagram: "instagram_booking",
  instagram_booking_enabled: "instagram_booking",
  pro_instagram_enabled: "instagram_booking",
  unique_reschedule_link: "unique_link",
  reschedule_link: "unique_link",
};

export function normalizeFeatureKey(value: string): FeatureKey | null {
  const normalized = String(value || "").trim().toLowerCase();

  if ((canonicalFeatureKeys as string[]).includes(normalized)) {
    return normalized as FeatureKey;
  }

  return featureKeyAliases[normalized] || null;
}

export const platformFeatures: FeatureDefinition[] = [
  {
    key: "pix",
    title: "PIX antecipado",
    description: "Permite oferecer desconto para pagamento antecipado.",
    released: true,
  },
  {
    key: "auto_confirmation",
    title: "Confirmação automática",
    description: "Envia os dados da confirmação para o WhatsApp da barbearia.",
    released: true,
  },
  {
    key: "service_delete",
    title: "Excluir serviço seguro",
    description: "Remove serviços da vitrine sem apagar histórico ou agendamentos antigos.",
    released: false,
  },
  {
    key: "backplate",
    title: "Plano de fundo personalizado",
    description: "Libera imagem de fundo para a tela do cliente e para o painel da barbearia.",
    released: false,
  },
  {
    key: "appearance_media",
    title: "Fotos Antes / Processo / Finalizado",
    description: "Mostra fotos de portfólio na vitrine de agendamento do cliente.",
    released: false,
  },
  {
    key: "promotions",
    title: "Promoções inteligentes",
    description: "Campanhas, preço promocional e descontos configuráveis para clientes.",
    released: false,
  },
  {
    key: "waitlist",
    title: "Lista de espera",
    description: "O cliente entra na fila quando não houver horário disponível.",
    released: false,
  },
  {
    key: "loyalty",
    title: "Fidelidade",
    description: "Recompensas por quantidade de atendimentos ou valor gasto.",
    released: false,
  },
  {
    key: "google_login",
    title: "Login Google cliente",
    description: "Histórico completo do cliente com uma conta Google.",
    released: false,
  },
  {
    key: "instagram_booking",
    title: "Agendamento pelo Instagram",
    description: "Entrada rápida para agendar direto dos perfis sociais.",
    released: false,
  },
  {
    key: "unique_link",
    title: "Link de remarcar/cancelar",
    description: "O cliente altera o próprio horário por um link único.",
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
