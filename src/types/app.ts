export type AdminRole = "desenvolvedor" | "dono" | "funcionario";

export type SubscriptionStatus =
  | "active"
  | "trial"
  | "pending"
  | "overdue"
  | "blocked"
  | "cancelled"
  | "archived";

export type PlanKey = "starter" | "professional" | "premium";

export type AppointmentStatus =
  | "scheduled"
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "missed";

export type PaymentMode = "pix" | "local" | "";

export type FeatureKey =
  | "pix"
  | "auto_confirmation"
  | "service_delete"
  | "backplate"
  | "appearance_media"
  | "promotions"
  | "visual_agenda"
  | "commissions"
  | "waitlist"
  | "loyalty"
  | "google_login"
  | "instagram_booking"
  | "unique_link";

export type PromotionType = "discount" | "price";

export type FeatureFlag = {
  enabled: boolean;
  released: boolean;
};

export type FeatureFlags = Partial<Record<FeatureKey, FeatureFlag>>;

export type FeatureDefinition = {
  description: string;
  key: FeatureKey;
  planFeature?: PlanFeatureKey;
  minPlan?: PlanKey;
  released: boolean;
  title: string;
};

export type PlanFeatureKey =
  | "multi_barbeiro"
  | "lembretes_whatsapp"
  | "relatorio_financeiro"
  | "historico_clientes"
  | "temas_personalizados"
  | "limite_agendamentos_mes";

export type PlanFeatureSet = {
  feature_historico_clientes: boolean;
  feature_lembretes_whatsapp: boolean;
  feature_limite_agendamentos_mes: number;
  feature_multi_barbeiro: boolean;
  feature_relatorio_financeiro: boolean;
  feature_temas_personalizados: boolean;
};

export type PlanRecord = PlanFeatureSet & {
  id: PlanKey | string;
  nome: string;
  valor_mensal: number;
};

export type Promotion = {
  active?: boolean;
  description?: string;
  discountPercent?: number;
  discountValue?: number;
  id?: string;
  promotionalPrice?: number;
  title?: string;
  type?: PromotionType;
};

export type Barbershop = {
  address?: string;
  adminBackgroundOpacity?: number;
  adminBackgroundUrl?: string;
  automaticConfirmationEnabled?: boolean;
  beforeImageLabel?: string;
  beforeImageUrl?: string;
  clientBackgroundOpacity?: number;
  clientBackgroundUrl?: string;
  finalImageLabel?: string;
  finalImageUrl?: string;
  instagramUrl?: string;
  logo?: string;
  logoImage?: string;
  mapsUrl?: string;
  monthlyStatus?: SubscriptionStatus;
  name: string;
  nextBillingDate?: string;
  ownerEmail?: string;
  pixDiscount?: number;
  pixEnabled?: boolean;
  pixKey?: string;
  plan?: PlanKey | string;
  processImageLabel?: string;
  processImageUrl?: string;
  promotions?: Promotion[];
  proAppearanceMediaEnabled?: boolean;
  proInstagramEnabled?: boolean;
  ratingText?: string;
  ratingValue?: number | string;
  slug?: string;
  successFooter?: string;
  successMessage?: string;
  successTitle?: string;
  themeColor?: string;
  themeColorSecondary?: string;
  themeTextColor?: string;
  themeMode?: "dark" | "light" | string;
  welcomeMessage?: string;
  whatsapp?: string;
};

export type Service = {
  active?: boolean;
  deleted_at?: string | null;
  duration: number;
  id?: string;
  name: string;
  price: number;
  sort_order?: number;
};

export type Professional = {
  active: boolean;
  avatarUrl?: string;
  commissionByService?: Record<string, number>;
  commissionPercent?: number;
  fixed?: boolean;
  id?: string;
  imageUrl?: string;
  name: string;
  photoUrl?: string;
};

export type Appointment = {
  clientName?: string;
  date?: string;
  duration?: number;
  email?: string;
  id?: string;
  note?: string;
  paid?: boolean;
  payment?: PaymentMode | string;
  professional?: string;
  publicToken?: string;
  rescheduleRequested?: boolean;
  services?: string;
  status?: AppointmentStatus | string;
  time?: string;
  token?: string;
  total?: number;
  whatsapp?: string;
};

export type Client = {
  email?: string;
  internalNotes?: string[];
  lastDate?: string;
  lastServices?: string;
  lastTime?: string;
  loyaltyPoints?: number;
  name: string;
  pendingPayment?: number;
  preferredProfessional?: string;
  revenue?: number;
  visits?: number;
  whatsapp: string;
  whatsappLink?: string;
};

export type PlatformShop = {
  admin_count?: number;
  archived_at?: string | null;
  days_to_billing?: number | null;
  features?: FeatureFlags;
  id?: string;
  monthly_status?: SubscriptionStatus;
  name?: string;
  next_billing_date?: string | null;
  owner_email?: string;
  plan?: PlanKey | string;
  plan_label?: string;
  plan_price?: number;
  service_count?: number;
  slug?: string;
  source?: string;
  status_label?: string;
  whatsapp?: string;
};

export type AccessAccount = {
  active: boolean;
  email: string;
  fixed?: boolean;
  id?: string;
  password?: string;
  passwordConfirm?: string;
  role: AdminRole | "Desenvolvedor" | "Dono" | "Funcionário" | "owner" | "manager" | "platform" | string;
};

export type WaitlistEntry = {
  client_name?: string;
  id?: string;
  preferred_date?: string;
  service_text?: string;
  whatsapp?: string;
};

export type LoyaltyClient = {
  id?: string;
  loyalty_points?: number;
  name?: string;
  visit_count?: number;
  whatsapp?: string;
};

export type GrowthSettings = {
  google_client_login_enabled: boolean;
  instagram_url: string;
  loyalty_discount: number;
  loyalty_enabled: boolean;
  loyalty_reward_description: string;
  loyalty_visit_goal: number;
  promotion_active: boolean;
  promotion_description: string;
  promotion_discount: number;
  promotion_end_date: string;
  promotion_start_date: string;
  promotion_title: string;
};

export type BackgroundSettings = {
  admin_background_opacity: number;
  admin_background_url: string;
  client_background_opacity: number;
  client_background_url: string;
};

export type SuccessTextSettings = {
  success_footer: string;
  success_message: string;
  success_title: string;
};

export type PlanOption = {
  description: string;
  features: string[];
  id: PlanKey;
  name: string;
  price: string;
  priceValue: number;
};
