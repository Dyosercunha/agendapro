export const platformFeatures = [
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
);

export function defaultFeatureFlags() {
  return platformFeatures.reduce((result, feature) => {
    result[feature.key] = {
      enabled: feature.key === "pix" || feature.key === "auto_confirmation",
      released: feature.released,
    };

    return result;
  }, {} as Record<string, { enabled: boolean; released: boolean }>);
}
