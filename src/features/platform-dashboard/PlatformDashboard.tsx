import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  getAdminAuthHealth,
  getAuthSession,
  getPlatformAuthAccesses,
  loginWithEmailPassword,
  loginWithGoogleRedirect,
  logoutAuth,
  onAuthStateChange,
  syncAdminAuthUser,
  syncPlatformAuthUser,
  updateCurrentPassword,
} from "../../lib/authApi";
import { getWhatsappStatus, sendWhatsappMessage } from "../../lib/appointmentsApi";
import {
  allowedAccessEmailMessage,
  isAllowedAccessEmailDomain,
  normalizeAccessEmail,
} from "../../lib/emailAccess";
import {
  archivePlatformBarbershop,
  callPlatformMaintenance as callPlatformMaintenanceRequest,
  createBarbershopFull,
  getDeployInfo,
  getPlatformBillingReminders,
  getPlatformDashboard,
  isPlatformAdmin,
  markBillingReminderSent,
  purgeArchivedBarbershops,
  savePlatformFeatureFlags,
  updatePlatformBarbershop,
} from "../../lib/platformApi";
import {
  planLabel as commercialPlanLabel,
  planOptions,
  planPriceFor,
  statusLabel as commercialStatusLabel,
  statusOptions,
} from "../../lib/commercial";
import {
  featureMinimumPlanLabel,
  featureUpgradeLabel,
  planMeetsFeaturePlan,
  platformFeatures,
} from "../../lib/features";
import { permissionScenarioMatrix } from "../../lib/permissions";
import { buildBookingPath, buildPanelPath, reservedRouteSegments, withAppOrigin } from "../../lib/routes";
import type { FeatureFlag, FeatureKey, PlatformShop, PlanKey, SubscriptionStatus } from "../../types/app";
import "../../styles.css";

const creationStatusOptions = statusOptions.filter((item) => item.value !== "archived");

type PlatformTab = "register" | "barbershops" | "diagnostics" | "access";

const platformTabItems: Array<{ description: string; id: PlatformTab; label: string }> = [
  {
    id: "register",
    label: "Cadastro",
    description: "Crie uma nova barbearia com dono, serviços, equipe e horários",
  },
  {
    id: "barbershops",
    label: "Barbearias",
    description: "Lista, planos, vencimentos e recursos por barbearia",
  },
  {
    id: "diagnostics",
    label: "Diagnóstico",
    description: "Supabase, Auth, WhatsApp, deploy e saúde técnica",
  },
  {
    id: "access",
    label: "Acessos",
    description: "Senhas e e-mails desenvolvedores da plataforma",
  },
];

type PlatformFilter = "all" | SubscriptionStatus | "pending" | string;

type PlatformStats = {
  active?: number;
  archived?: number;
  blocked?: number;
  cancelled?: number;
  churn_month?: number;
  churn_risk?: number;
  mrr?: number;
  mrr_history?: MrrPoint[];
  monthly_revenue?: number;
  new_barbershops_month?: number;
  next_billing?: string | null;
  overdue?: number;
  overdue_revenue?: number;
  total?: number;
  trial?: number;
};

type MrrPoint = {
  label?: string;
  month?: string;
  value?: number;
};

type PlatformFeatureFlags = Record<string, FeatureFlag | undefined>;

type PlatformShopRecord = Omit<PlatformShop, "features" | "monthly_status" | "plan" | "plan_price"> & {
  address?: string;
  address_number?: string;
  cep?: string;
  features?: PlatformFeatureFlags;
  monthly_status?: SubscriptionStatus | "pending" | string;
  owner_password?: string;
  pix_key?: string;
  plan?: PlanKey | string;
  plan_price?: number | string;
  theme_color?: string;
};

type PlatformDashboardData = {
  barbershops: PlatformShopRecord[];
  stats: PlatformStats;
};

type NewShopForm = {
  address: string;
  address_number: string;
  cep: string;
  logo_url: string;
  monthly_status: SubscriptionStatus | "pending";
  name: string;
  next_billing_date: string;
  owner_email: string;
  owner_password: string;
  pix_key: string;
  plan: PlanKey | string;
  plan_price: number | string;
  slug: string;
  theme_color: string;
  whatsapp: string;
};

type OnboardingService = {
  duration: number | string;
  name: string;
  price: number | string;
};

type OnboardingProfessional = {
  name: string;
  photo_url: string;
};

type OnboardingHour = {
  enabled: boolean;
  end_time: string;
  start_time: string;
  week_day: number;
};

type OnboardingCreatedShop = {
  barbershop_id?: string;
  link_cliente?: string;
  link_painel?: string;
  slug: string;
};

type CepAddressResponse = {
  bairro?: string;
  erro?: boolean;
  localidade?: string;
  logradouro?: string;
  uf?: string;
};

type HealthCheck = {
  detail?: string;
  error?: string;
  ok?: boolean;
};

type AuthHealth = HealthCheck & {
  serviceRoleConfigured?: boolean;
};

type WhatsappHealth = HealthCheck & {
  missing?: string[];
  providerLabel?: string;
  ready?: boolean;
};

type DeployHealth = HealthCheck & {
  branch?: string;
  commitSha?: string;
  environment?: string;
};

type SystemHealth = {
  auth: AuthHealth | null;
  checkedAt: string;
  data: { active?: number; archived?: number; total?: number } | null;
  deploy: DeployHealth | null;
  loading: boolean;
  rpc: HealthCheck | null;
  supabase: HealthCheck | null;
  whatsapp: WhatsappHealth | null;
};

type PlatformLogin = {
  email: string;
  password: string;
};

type PlatformAccessRecord = {
  active?: boolean;
  created_at?: string;
  email: string;
};

type PlatformAccessForm = {
  active: boolean;
  confirm: string;
  email: string;
  password: string;
};

type PlatformPasswordForm = {
  confirm: string;
  next: string;
};

type CloudAudit = {
  barbershops: PlatformShopRecord[];
};

type MaintenanceResult = {
  barbershops?: PlatformShopRecord[];
  data?: unknown;
  error?: unknown;
};

type CreateShopResult = {
  barbershop_id?: string;
  link_cliente?: string;
  link_painel?: string;
  slug?: string;
};

type OwnerAuthPayload = {
  email: string;
  id?: string;
  password?: string;
  role?: string;
  slug?: string;
};

type BillingReminder = {
  message: string;
  slug: string;
  whatsapp: string;
};

type PurgeResult = {
  deleted_appointments?: number;
  deleted_barbershops?: number;
  deleted_clients?: number;
};

type StatCardProps = {
  hint?: string;
  label: string;
  value?: React.ReactNode;
};

type HealthTone = "danger" | "neutral" | "ready" | "warning";

type HealthItemProps = {
  detail?: string;
  label: string;
  status: React.ReactNode;
  tone?: HealthTone;
};

function makeSlug(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

const reservedBarbershopSlugs = reservedRouteSegments;

function isReservedBarbershopSlug(value = "") {
  const slug = makeSlug(value);
  return !slug || reservedBarbershopSlugs.has(slug);
}

function onlyDigits(value: unknown = "") {
  return String(value).replace(/\D/g, "");
}

function errorText(error: unknown) {
  if (!error) return "Erro desconhecido.";
  if (error instanceof Error) return error.message;

  if (typeof error === "object") {
    const errorData = error as { details?: string; hint?: string; message?: string };
    return errorData.message || errorData.details || errorData.hint || String(error);
  }

  return String(error);
}

function isServiceRoleMissing(error: unknown) {
  return errorText(error).includes("SUPABASE_SERVICE_ROLE");
}

function ownerLoginErrorText(error: unknown) {
  if (isServiceRoleMissing(error)) {
    return "Barbearia salva, mas o login do dono não foi criado porque falta configurar SUPABASE_SERVICE_ROLE_KEY no Vercel. Depois de configurar, edite a barbearia e preencha a nova senha do dono.";
  }

  return errorText(error);
}

function money(value: unknown) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateText(value: unknown) {
  if (!value) return "Sem vencimento";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function futureDateText(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function withTimeout<T>(promise: PromiseLike<T>, label: string, timeoutMs = 9000) {
  let timeoutId: ReturnType<typeof window.setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} demorou para responder. Atualize a página e tente novamente.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

function buildCepAddress(cepData: CepAddressResponse, number: unknown) {
  const street = cepData?.logradouro || "";
  const neighborhood = cepData?.bairro || "";
  const city = cepData?.localidade || "";
  const state = cepData?.uf || "";
  const cleanNumber = String(number || "").trim();

  if (!street || !cleanNumber) return "";

  return [
    `${street}, ${cleanNumber}`,
    neighborhood,
    city && state ? `${city} - ${state}` : city || state,
  ]
    .filter(Boolean)
    .join(" - ");
}

async function fetchCepAddress(cep: unknown, number: unknown) {
  const cleanCep = onlyDigits(cep);
  const cleanNumber = String(number || "").trim();

  if (cleanCep.length !== 8) {
    throw new Error("Informe um CEP válido com 8 números.");
  }

  if (!cleanNumber) {
    throw new Error("Informe o número do comércio antes de puxar o endereço pelo CEP.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  const data = (await response.json().catch(() => null)) as CepAddressResponse | null;

  if (!response.ok || !data || data.erro) {
    throw new Error("CEP não encontrado. Cadastre o endereço manualmente.");
  }

  const address = buildCepAddress(data, cleanNumber);
  if (!address) {
    throw new Error("O CEP não trouxe rua válida ou está faltando o número do comércio. Cadastre manualmente.");
  }

  return address;
}

function emptyForm(): NewShopForm {
  return {
    name: "",
    slug: "",
    whatsapp: "",
    owner_email: "",
    owner_password: "",
    logo_url: "",
    plan: "professional",
    monthly_status: "trial",
    next_billing_date: "",
    cep: "",
    address_number: "",
    address: "",
    pix_key: "",
    theme_color: "#22c55e",
    plan_price: planPriceFor("professional"),
  };
}

const onboardingSteps = [
  "Dados",
  "Serviços",
  "Equipe",
  "Horários",
  "Pronto",
];

const weekDayLabels = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function defaultOnboardingServices(): OnboardingService[] {
  return [
    { name: "Corte de cabelo", duration: 30, price: 35 },
    { name: "Barba", duration: 20, price: 25 },
  ];
}

function defaultOnboardingProfessionals(): OnboardingProfessional[] {
  return [{ name: "", photo_url: "" }];
}

function defaultOnboardingHours(): OnboardingHour[] {
  return weekDayLabels.map((_, weekDay) => ({
    week_day: weekDay,
    enabled: weekDay >= 2 && weekDay <= 6,
    start_time: "10:00",
    end_time: "20:00",
  }));
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

function statusBadge(status: unknown, label?: unknown) {
  const normalized = String(status || "").toLowerCase();
  const value = commercialStatusLabel(normalized) || String(label || status || "");

  if (normalized === "archived") return <b className="statusArchived">Arquivado</b>;
  if (normalized === "cancelled") return <b className="statusCancelled">Cancelado</b>;
  if (normalized === "blocked") return <b className="statusBlocked">Bloqueado</b>;
  if (normalized === "overdue") return <b className="statusOverdue">Atrasado</b>;
  if (normalized === "pending") return <b className="statusPending">Pendente</b>;
  if (normalized === "trial") return <b className="statusTrial">Teste 30 dias</b>;

  return <b className="statusActive">{value || "Ativo"}</b>;
}

function planLabel(plan: unknown) {
  return commercialPlanLabel(String(plan || ""));
}

function statusLabel(status: unknown) {
  return commercialStatusLabel(String(status || ""));
}

function normalizeAuditShop(shop: PlatformShopRecord = {}) {
  return {
    ...shop,
    plan_label: shop.plan_label || planLabel(shop.plan),
    status_label: statusLabel(shop.monthly_status),
    days_to_billing:
      typeof shop.days_to_billing === "number"
        ? shop.days_to_billing
        : shop.next_billing_date
        ? Math.ceil((new Date(shop.next_billing_date).getTime() - Date.now()) / 86400000)
        : null,
    source: shop.source || "diagnostics",
  };
}

function mergeShopLists(primary: PlatformShopRecord[] = [], fallback: PlatformShopRecord[] = []) {
  const map = new Map<string, PlatformShopRecord>();

  fallback.forEach((shop) => {
    const key = shop?.id || shop?.slug;
    if (key) map.set(key, normalizeAuditShop(shop));
  });

  primary.forEach((shop) => {
    if (shop?.id || shop?.slug) {
      const key = shop.id || shop.slug;
      if (!key) return;
      map.set(key, normalizeAuditShop({ ...(map.get(key) || {}), ...shop, source: "dashboard" }));
    }
  });

  return Array.from(map.values());
}

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="platformStat">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}

function MrrLineChart({ points = [] }: { points?: MrrPoint[] }) {
  const safePoints = points.length
    ? points
    : Array.from({ length: 6 }, (_, index) => ({
        label: `M-${5 - index}`,
        value: 0,
      }));
  const values = safePoints.map((point) => Number(point.value || 0));
  const max = Math.max(...values, 1);
  const width = 560;
  const height = 170;
  const paddingX = 22;
  const paddingY = 20;
  const step = safePoints.length > 1 ? (width - paddingX * 2) / (safePoints.length - 1) : 0;
  const coords = safePoints.map((point, index) => {
    const value = Number(point.value || 0);
    const x = paddingX + index * step;
    const y = height - paddingY - (value / max) * (height - paddingY * 2);
    return { ...point, value, x, y };
  });
  const path = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  return (
    <article className="platformMrrChart">
      <div className="platformChartTitle">
        <div>
          <span>Evolução</span>
          <h2>MRR dos últimos 6 meses</h2>
        </div>
        <strong>{money(values[values.length - 1] || 0)}</strong>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Evolução do MRR">
        <defs>
          <linearGradient id="platformMrrGradient" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#4ade80" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d={`${path} L ${width - paddingX} ${height - paddingY} L ${paddingX} ${height - paddingY} Z`}
          fill="rgba(34, 197, 94, 0.08)"
        />
        <path d={path} fill="none" stroke="url(#platformMrrGradient)" strokeLinecap="round" strokeWidth="5" />
        {coords.map((point) => (
          <g key={`${point.month || point.label}-${point.x}`}>
            <circle cx={point.x} cy={point.y} fill="#22c55e" r="5" />
            <text x={point.x} y={height - 4} textAnchor="middle">
              {point.label || point.month}
            </text>
          </g>
        ))}
      </svg>
    </article>
  );
}

function checkedAtText() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HealthItem({ label, status, detail, tone = "neutral" }: HealthItemProps) {
  return (
    <article className={`platformHealthItem ${tone}`}>
      <span>{label}</span>
      <strong>{status}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function shortCommit(value: unknown = "") {
  return value ? String(value).slice(0, 7) : "Não informado";
}

function GoogleIcon() {
  return (
    <svg className="googleIcon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.12-1.43.34-2.1V7.06H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function PlatformDashboard() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [message, setMessage] = useState("");
  const [dashboard, setDashboard] = useState<PlatformDashboardData>({ stats: {}, barbershops: [] });
  const [newShop, setNewShop] = useState(emptyForm());
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingCreated, setOnboardingCreated] = useState<OnboardingCreatedShop | null>(null);
  const [onboardingServices, setOnboardingServices] = useState<OnboardingService[]>(defaultOnboardingServices);
  const [onboardingProfessionals, setOnboardingProfessionals] =
    useState<OnboardingProfessional[]>(defaultOnboardingProfessionals);
  const [onboardingHours, setOnboardingHours] = useState<OnboardingHour[]>(defaultOnboardingHours);
  const [selectedShop, setSelectedShop] = useState<PlatformShopRecord | null>(null);
  const [saving, setSaving] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [filter, setFilter] = useState<PlatformFilter>("all");
  const [platformTab, setPlatformTab] = useState<PlatformTab>("register");
  const [platformMenuOpen, setPlatformMenuOpen] = useState(false);
  const platformMenuRef = useRef<HTMLElement | null>(null);
  const onboardingCardRef = useRef<HTMLDivElement | null>(null);
  const [focusedOnboardingAfterLogin, setFocusedOnboardingAfterLogin] = useState(false);
  const [lastError, setLastError] = useState("");
  const [platformLogin, setPlatformLogin] = useState<PlatformLogin>({
    email: "appagenda.pro@gmail.com",
    password: "",
  });
  const [platformAccesses, setPlatformAccesses] = useState<PlatformAccessRecord[]>([]);
  const [platformAccessForm, setPlatformAccessForm] = useState<PlatformAccessForm>({
    active: true,
    confirm: "",
    email: "",
    password: "",
  });
  const [platformPasswordForm, setPlatformPasswordForm] = useState<PlatformPasswordForm>({
    confirm: "",
    next: "",
  });
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<Record<string, boolean>>({});
  const [cloudAudit, setCloudAudit] = useState<CloudAudit>({ barbershops: [] });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    loading: false,
    checkedAt: "",
    supabase: null,
    rpc: null,
    auth: null,
    whatsapp: null,
    deploy: null,
    data: null,
  });

  const auditActiveShops = useMemo(
    () => (cloudAudit?.barbershops || []).filter((shop) => !shop.archived_at).map(normalizeAuditShop),
    [cloudAudit]
  );
  const archivedShops = useMemo(
    () => (cloudAudit?.barbershops || []).filter((shop) => shop.archived_at).map(normalizeAuditShop),
    [cloudAudit]
  );
  const shops = useMemo(
    () => mergeShopLists(dashboard?.barbershops || [], auditActiveShops),
    [dashboard?.barbershops, auditActiveShops]
  );

  const filteredShops = useMemo(() => {
    return [...shops]
      .filter((shop) => filter === "all" || shop.status_label === filter || shop.monthly_status === filter)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }, [shops, filter]);
  const onboardingSlug = onboardingCreated?.slug || newShop.slug || makeSlug(newShop.name);
  const platformOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://calendarproapp.vercel.app";
  const onboardingClientLink =
    onboardingCreated?.link_cliente || (onboardingSlug ? withAppOrigin(platformOrigin, buildBookingPath(onboardingSlug)) : "");
  const onboardingPanelLink =
    onboardingCreated?.link_painel || (onboardingSlug ? withAppOrigin(platformOrigin, buildPanelPath(onboardingSlug)) : "");
  const currentPlatformTab = platformTabItems.find((tab) => tab.id === platformTab) || platformTabItems[0];

  function passwordInputType(field: string) {
    return visiblePasswordFields[field] ? "text" : "password";
  }

  function togglePasswordField(field: string) {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function passwordRevealLabel(field: string) {
    return "👁";
  }

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setChecking(true);
      try {
        const { data } = await withTimeout(getAuthSession(), "A sessão");
        if (!mounted) return;
        setSession(data?.session || null);
        await checkDeveloper(data?.session || null);
      } catch (error) {
        if (!mounted) return;
        setIsDeveloper(false);
        setLoading(false);
        rememberError("Sessão Plataforma", error);
        setMessage("Não foi possível carregar sua sessão: " + errorText(error));
      } finally {
        if (mounted) setChecking(false);
      }
    }

    const { data: listener } = onAuthStateChange(async (event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      if (!mounted) return;

      setSession(nextSession || null);

      window.setTimeout(async () => {
        if (!mounted) return;

        setChecking(true);
        try {
          await checkDeveloper(nextSession || null);
        } finally {
          if (mounted) setChecking(false);
        }
      }, 0);
    });

    boot();

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!platformMenuOpen || typeof window === "undefined") return undefined;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPlatformMenuOpen(false);
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Node && platformMenuRef.current?.contains(target)) return;
      setPlatformMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [platformMenuOpen]);

  useEffect(() => {
    if (
      !isDeveloper ||
      checking ||
      loading ||
      focusedOnboardingAfterLogin ||
      platformTab !== "register"
    ) {
      return;
    }

    setFocusedOnboardingAfterLogin(true);

    window.setTimeout(() => {
      onboardingCardRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    }, 120);
  }, [checking, focusedOnboardingAfterLogin, isDeveloper, loading, platformTab]);

  async function checkDeveloper(currentSession: Session | null = session) {
    try {
      const sessionEmail = normalizeAccessEmail(currentSession?.user?.email || "");

    if (!sessionEmail) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Faça login com o e-mail desenvolvedor para puxar e salvar os dados na nuvem.");
      return;
    }

    if (!isAllowedAccessEmailDomain(sessionEmail)) {
      await logoutAuth();
      setIsDeveloper(false);
      setLoading(false);
      setMessage(allowedAccessEmailMessage);
      return;
    }

    const { data, error } = await withTimeout(isPlatformAdmin(), "A verificação do desenvolvedor");
    let hasPlatformAccess = !error && data === true;

    if (!hasPlatformAccess) {
      try {
        await withTimeout(getPlatformAuthAccesses(), "A validação segura do desenvolvedor");
        hasPlatformAccess = true;
      } catch (fallbackError) {
        rememberError("Validação segura do desenvolvedor", fallbackError);
      }
    }

    if (!hasPlatformAccess) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Este e-mail não está liberado como desenvolvedor da plataforma.");
      return;
    }

    setIsDeveloper(true);
    setMessage("");
    await loadDashboard();
    await loadPlatformAccesses();
    await checkSystemHealth();
    } catch (error) {
      setIsDeveloper(false);
      setLoading(false);
      rememberError("Validação do desenvolvedor", error);
      setMessage("Não foi possível validar o acesso do desenvolvedor: " + errorText(error));
    }
  }

  function rememberError(source: string, error: unknown) {
    const text = `${source}: ${errorText(error)}`;
    setLastError(text);
    return text;
  }

  async function checkSystemHealth() {
    setSystemHealth((current) => ({ ...current, loading: true }));

    const [adminResult, dashboardResult, maintenanceResult, authResult, whatsappResult, deployResult] =
      await Promise.allSettled([
        isPlatformAdmin(),
        getPlatformDashboard(),
        callPlatformMaintenance({ action: "diagnostics" }),
        getAdminAuthHealth(),
        getWhatsappStatus(),
        getDeployInfo(),
      ]);

    const dashboardData =
      dashboardResult.status === "fulfilled"
        ? (dashboardResult.value?.data as PlatformDashboardData | null)
        : null;
    const maintenanceData =
      maintenanceResult.status === "fulfilled"
        ? ((maintenanceResult.value as MaintenanceResult)?.barbershops || [])
        : [];
    const archivedCount = maintenanceData.filter((shop) => shop.archived_at).length;
    const activeCount = maintenanceData.filter((shop) => !shop.archived_at).length;
    const rpcOk =
      adminResult.status === "fulfilled" &&
      adminResult.value?.error == null &&
      adminResult.value?.data === true &&
      dashboardResult.status === "fulfilled" &&
      dashboardResult.value?.error == null;
    const settledResults = [
      adminResult,
      dashboardResult,
      maintenanceResult,
      authResult,
      whatsappResult,
      deployResult,
    ];
    const firstErrorText = settledResults.reduce<string>((current, item) => {
      if (current) return current;
      if (item.status === "rejected") return errorText(item.reason);
      return item.value?.error ? errorText(item.value.error) : "";
    }, "");
    const maintenanceError = maintenanceResult.status === "rejected" ? maintenanceResult.reason : null;
    const dashboardError = dashboardResult.status === "rejected" ? dashboardResult.reason : null;
    const adminError =
      adminResult.status === "rejected" ? adminResult.reason : adminResult.value?.error;

    if (firstErrorText) {
      setLastError(firstErrorText);
    }

    setSystemHealth({
      loading: false,
      checkedAt: checkedAtText(),
      supabase: {
        ok: maintenanceResult.status === "fulfilled" || dashboardResult.status === "fulfilled",
        detail:
          maintenanceResult.status === "fulfilled"
            ? "Consulta segura com service role respondeu."
            : dashboardResult.status === "fulfilled"
            ? "RPC principal respondeu pela sessão atual."
            : errorText(maintenanceError || dashboardError),
      },
      rpc: {
        ok: rpcOk,
        detail: rpcOk
          ? "is_platform_admin e get_platform_dashboard responderam."
          : errorText(
              adminError ||
                dashboardError ||
                (dashboardResult.status === "fulfilled" ? dashboardResult.value?.error : null)
            ),
      },
      auth:
        authResult.status === "fulfilled"
          ? (authResult.value as AuthHealth)
          : { ok: false, error: errorText(authResult.reason) },
      whatsapp:
        whatsappResult.status === "fulfilled"
          ? (whatsappResult.value as WhatsappHealth)
          : { ok: false, error: errorText(whatsappResult.reason), missing: [] },
      deploy:
        deployResult.status === "fulfilled"
          ? (deployResult.value as DeployHealth)
          : { ok: false, error: errorText(deployResult.reason) },
      data: {
        total: maintenanceData.length || dashboardData?.stats?.total || shops.length || 0,
        active: activeCount || dashboardData?.stats?.active || shops.length || 0,
        archived: archivedCount || dashboardData?.stats?.archived || archivedShops.length || 0,
      },
    });
  }

  async function loadDashboard(options: { silent?: boolean } = {}) {
    const silent = Boolean(options.silent);

    if (!silent) setLoading(true);
    try {
    const { data, error } = await withTimeout(getPlatformDashboard(), "O painel da plataforma");
    if (error) {
      rememberError("get_platform_dashboard", error);
      setMessage("Não foi possível puxar dados da nuvem: " + errorText(error));
      return;
    }
    setDashboard((data as PlatformDashboardData | null) || { stats: {}, barbershops: [] });
    await loadCloudAudit().catch(() => null);
    } catch (error) {
      rememberError("Painel Plataforma", error);
      setMessage("Não foi possível puxar dados da nuvem: " + errorText(error));
      setDashboard({ stats: {}, barbershops: [] });
      await loadCloudAudit({ allowDashboardFallback: true }).catch(() => null);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function loadPlatformAccesses() {
    try {
      const result = (await getPlatformAuthAccesses()) as {
        accesses?: PlatformAccessRecord[];
        error?: unknown;
        ok?: boolean;
      };

      if (result.error || result.ok === false) throw result.error || result;

      setPlatformAccesses(result.accesses || []);
    } catch (error) {
      rememberError("Acessos da plataforma", error);
    }
  }

  async function updatePlatformOwnPassword() {
    const nextPassword = platformPasswordForm.next.trim();
    const confirmation = platformPasswordForm.confirm.trim();

    if (nextPassword.length < 6) {
      setMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (nextPassword !== confirmation) {
      setMessage("A confirmação da senha não confere.");
      return;
    }

    setSaving("platform-password");
    setMessage("");

    try {
      const { error } = await updateCurrentPassword(nextPassword);
      if (error) throw error;

      setPlatformPasswordForm({ next: "", confirm: "" });
      setMessage("Senha do desenvolvedor atualizada. No próximo acesso você já pode entrar com e-mail e senha.");
    } catch (error) {
      rememberError("Alterar senha do desenvolvedor", error);
      setMessage("Não foi possível alterar sua senha: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function savePlatformAccess(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    const email = normalizeAccessEmail(platformAccessForm.email);
    const password = platformAccessForm.password.trim();
    const confirmation = platformAccessForm.confirm.trim();

    if (!email.includes("@")) {
      setMessage("Informe um e-mail válido para o novo acesso.");
      return;
    }

    if (!isAllowedAccessEmailDomain(email)) {
      setMessage(allowedAccessEmailMessage);
      return;
    }

    if (password.length < 6) {
      setMessage("Informe uma senha com pelo menos 6 caracteres para este acesso.");
      return;
    }

    if (password !== confirmation) {
      setMessage("A confirmação da senha deste acesso não confere.");
      return;
    }

    setSaving("platform-access");
    setMessage("");

    try {
      const result = (await syncPlatformAuthUser({
        active: platformAccessForm.active,
        email,
        password,
      })) as {
        accesses?: PlatformAccessRecord[];
        error?: unknown;
        ok?: boolean;
      };

      if (result.error || result.ok === false) throw result.error || result;

      setPlatformAccessForm({ active: true, confirm: "", email: "", password: "" });
      setPlatformAccesses(result.accesses || []);
      setMessage("Acesso desenvolvedor criado/atualizado. Este e-mail já pode entrar com senha.");
    } catch (error) {
      rememberError("Salvar acesso desenvolvedor", error);
      setMessage("Não foi possível salvar o acesso desenvolvedor: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function disablePlatformAccess(email: string) {
    const clean = String(email || "").trim().toLowerCase();
    if (!clean) return;

    setSaving("disable-platform-" + clean);
    setMessage("");

    try {
      const result = (await syncPlatformAuthUser({
        active: false,
        email: clean,
      })) as {
        accesses?: PlatformAccessRecord[];
        error?: unknown;
        ok?: boolean;
      };

      if (result.error || result.ok === false) throw result.error || result;

      setPlatformAccesses(result.accesses || []);
      setMessage("Acesso desenvolvedor desativado.");
    } catch (error) {
      rememberError("Desativar acesso desenvolvedor", error);
      setMessage("Não foi possível desativar este acesso: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function callPlatformMaintenance(payload: Record<string, unknown>) {
    return callPlatformMaintenanceRequest(payload) as Promise<MaintenanceResult>;
  }

  async function loadCloudAudit(options: { allowDashboardFallback?: boolean } = {}) {
    const result = await callPlatformMaintenance({ action: "diagnostics" });
    const resultShops = result.barbershops || [];
    const nextAudit = { barbershops: resultShops };
    setCloudAudit(nextAudit);

    if (options.allowDashboardFallback && resultShops.length) {
      const active = resultShops.filter((shop) => !shop.archived_at).map(normalizeAuditShop);
      setDashboard((current) => ({
        ...(current || {}),
        barbershops: active,
        stats: {
          ...(current?.stats || {}),
          total: active.length,
          archived: resultShops.filter((shop) => shop.archived_at).length,
        },
      }));
    }

    return nextAudit;
  }

  async function restoreArchivedShop(shop: PlatformShopRecord) {
    if (!shop?.id && !shop?.slug) return;

    setSaving("restore-" + (shop.id || shop.slug));
    setMessage("");

    try {
      const result = await callPlatformMaintenance({
        action: "restore",
        id: shop.id,
        slug: shop.slug,
      });

      setCloudAudit({ barbershops: result.barbershops || [] });
      setMessage(`Barbearia ${shop.name || shop.slug} restaurada. Agora ela volta para a lista principal.`);
      await loadDashboard();
    } catch (error) {
      rememberError("Restaurar barbearia arquivada", error);
      setMessage("Não foi possível restaurar a barbearia: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function login() {
    const typedEmail = normalizeAccessEmail(platformLogin.email);

    if (typedEmail && !isAllowedAccessEmailDomain(typedEmail)) {
      setMessage(allowedAccessEmailMessage);
      return;
    }

    const { error } = await loginWithGoogleRedirect(`${window.location.origin}/plataforma?platform=1`);
    if (error) setMessage(errorText(error));
  }

  async function loginWithPassword() {
    setSaving("platform-login");
    setMessage("");

    try {
      const email = normalizeAccessEmail(platformLogin.email);

      if (!isAllowedAccessEmailDomain(email)) {
        setMessage(allowedAccessEmailMessage);
        return;
      }

      const { error } = await loginWithEmailPassword(email, platformLogin.password);

      if (error) throw error;
    } catch (error) {
      rememberError("Login Plataforma", error);
      setMessage("Não foi possível entrar com e-mail e senha: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function logout() {
    await logoutAuth();
    setIsDeveloper(false);
    setSession(null);
    setDashboard({ stats: {}, barbershops: [] });
    setMessage("Você saiu do Painel AgendaPro.");
  }

  function updateNewShop<K extends keyof NewShopForm>(field: K, value: NewShopForm[K]) {
    setNewShop((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugTouched) next.slug = makeSlug(String(value));
      if (field === "slug") next.slug = makeSlug(String(value));
      if (field === "plan") {
        next.plan_price = planPriceFor(String(value));
        next.features = platformFeatures.reduce<PlatformFeatureFlags>((result, feature) => {
          const previous = current.features?.[feature.key] || { enabled: false, released: false };
          const planAllows = planMeetsFeaturePlan(String(value || ""), feature.minPlan);
          result[feature.key] = {
            released: planAllows && Boolean(previous.released),
            enabled: planAllows && Boolean(previous.released) && Boolean(previous.enabled),
          };
          return result;
        }, {});
      }
      return next;
    });
  }

  async function fillNewShopAddressByCep() {
    setSaving("cep-create");
    setMessage("");
    try {
      const address = await fetchCepAddress(newShop.cep, newShop.address_number);
      updateNewShop("address", address);
      setMessage("Endereço encontrado pelo CEP. Confira antes de cadastrar.");
    } catch (error) {
      rememberError("Buscar CEP da nova barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function handleNewShopLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      updateNewShop("logo_url", dataUrl);
      setMessage("Logo carregada. Salve a etapa para sincronizar na nuvem.");
    } catch (error) {
      rememberError("Logo da nova barbearia", error);
      setMessage(errorText(error));
    }
  }

  function updateOnboardingService<K extends keyof OnboardingService>(
    index: number,
    field: K,
    value: OnboardingService[K]
  ) {
    setOnboardingServices((current) =>
      current.map((service, serviceIndex) => (serviceIndex === index ? { ...service, [field]: value } : service))
    );
  }

  function updateOnboardingProfessional<K extends keyof OnboardingProfessional>(
    index: number,
    field: K,
    value: OnboardingProfessional[K]
  ) {
    setOnboardingProfessionals((current) =>
      current.map((professional, professionalIndex) =>
        professionalIndex === index ? { ...professional, [field]: value } : professional
      )
    );
  }

  function updateOnboardingHour<K extends keyof OnboardingHour>(
    index: number,
    field: K,
    value: OnboardingHour[K]
  ) {
    setOnboardingHours((current) =>
      current.map((hour, hourIndex) => (hourIndex === index ? { ...hour, [field]: value } : hour))
    );
  }

  async function handleOnboardingProfessionalPhoto(index: number, file?: File) {
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      updateOnboardingProfessional(index, "photo_url", dataUrl);
      setMessage("Foto do profissional carregada. Salve a etapa para sincronizar.");
    } catch (error) {
      rememberError("Foto do profissional", error);
      setMessage(errorText(error));
    }
  }

  function resetOnboardingWizard() {
    setNewShop(emptyForm());
    setOnboardingStep(1);
    setOnboardingCreated(null);
    setOnboardingServices(defaultOnboardingServices());
    setOnboardingProfessionals(defaultOnboardingProfessionals());
    setOnboardingHours(defaultOnboardingHours());
    setSlugTouched(false);
  }

  async function copyText(value: string, label = "Link") {
    if (!value) return;

    await navigator.clipboard?.writeText(value);
    setMessage(`${label} copiado.`);
  }

  async function ensureOnboardingShop() {
    const ownerPassword = String(newShop.owner_password || "").trim();
    const targetSlug = onboardingCreated?.slug || newShop.slug || makeSlug(newShop.name);

    if (!newShop.name.trim()) throw new Error("Informe o nome da barbearia.");
    if (isReservedBarbershopSlug(targetSlug)) {
      throw new Error("Este link é reservado para o AgendaPro. Use outro, como master-barbearia.");
    }
    if (!newShop.owner_email.trim()) throw new Error("Informe o e-mail do dono.");
    if (!isAllowedAccessEmailDomain(newShop.owner_email)) throw new Error(allowedAccessEmailMessage);
    if (!onboardingCreated && ownerPassword.length < 6) {
      throw new Error("Informe uma senha inicial do dono com pelo menos 6 caracteres.");
    }
    if (!newShop.next_billing_date) throw new Error("Informe a data de vencimento da assinatura.");
    if (Number(newShop.plan_price || 0) <= 0) throw new Error("Informe o valor mensal do plano.");

    const payload = {
      action: onboardingCreated ? "update-basic" : "create",
      onboarding_input: true,
      skip_defaults: true,
      target_slug: targetSlug,
      name_input: newShop.name,
      slug_input: targetSlug,
      whatsapp_input: onlyDigits(newShop.whatsapp),
      owner_email_input: newShop.owner_email,
      plan_input: newShop.plan,
      monthly_status_input: newShop.monthly_status,
      next_billing_date_input: newShop.next_billing_date || null,
      address_input: newShop.address,
      pix_key_input: newShop.pix_key,
      theme_color_input: newShop.theme_color || "#22c55e",
      plan_price_input: Number(newShop.plan_price || 0),
      logo_url_input: newShop.logo_url || null,
    };

    const result = (await callPlatformMaintenance(payload)) as {
      shop?: CreateShopResult;
    };

    const shop = result.shop || onboardingCreated || {
      slug: targetSlug,
      link_cliente: withAppOrigin(platformOrigin, buildBookingPath(targetSlug)),
      link_painel: withAppOrigin(platformOrigin, buildPanelPath(targetSlug)),
    };

    if (!onboardingCreated && ownerPassword) {
      await syncOwnerAuthUser({
        id: shop.barbershop_id,
        slug: shop.slug,
        email: newShop.owner_email,
        password: ownerPassword,
        role: "owner",
      });
    }

    setOnboardingCreated({
      barbershop_id: shop.barbershop_id,
      link_cliente: shop.link_cliente || withAppOrigin(platformOrigin, buildBookingPath(shop.slug)),
      link_painel: shop.link_painel || withAppOrigin(platformOrigin, buildPanelPath(shop.slug)),
      slug: String(shop.slug || targetSlug),
    });

    return shop;
  }

  async function saveOnboardingBasic() {
    setSaving("onboarding-basic");
    setMessage("");

    try {
      await ensureOnboardingShop();
      await loadDashboard({ silent: true });
      setOnboardingStep(2);
      setMessage("Dados básicos salvos. Agora cadastre os serviços.");
    } catch (error) {
      rememberError("Onboarding dados básicos", error);
      setMessage(ownerLoginErrorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveOnboardingServices() {
    setSaving("onboarding-services");
    setMessage("");

    try {
      const shop = await ensureOnboardingShop();
      const services = onboardingServices
        .map((service, index) => ({
          active: true,
          duration: Math.max(5, Number(service.duration || 0)),
          name: String(service.name || "").trim(),
          price: Math.max(0, Number(service.price || 0)),
          sort_order: index + 1,
        }))
        .filter((service) => service.name);

      if (!services.length) throw new Error("Cadastre pelo menos um serviço.");

      await callPlatformMaintenance({
        action: "save-services",
        services_input: services,
        target_slug: shop.slug,
      });

      await loadDashboard({ silent: true });
      setOnboardingStep(3);
      setMessage("Serviços salvos. Agora cadastre a equipe ou pule se for solo.");
    } catch (error) {
      rememberError("Onboarding serviços", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveOnboardingProfessionals(skipSolo = false) {
    setSaving("onboarding-professionals");
    setMessage("");

    try {
      const shop = await ensureOnboardingShop();
      const professionals = skipSolo
        ? []
        : onboardingProfessionals
            .map((professional) => ({
              active: true,
              name: String(professional.name || "").trim(),
              photo_url: professional.photo_url || null,
            }))
            .filter((professional) => professional.name);

      await callPlatformMaintenance({
        action: "save-professionals",
        professionals_input: professionals,
        solo_input: skipSolo || !professionals.length,
        target_slug: shop.slug,
      });

      await loadDashboard({ silent: true });
      setOnboardingStep(4);
      setMessage(skipSolo ? "Equipe marcada como solo. Configure os horários." : "Equipe salva. Configure os horários.");
    } catch (error) {
      rememberError("Onboarding equipe", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveOnboardingHours() {
    setSaving("onboarding-hours");
    setMessage("");

    try {
      const shop = await ensureOnboardingShop();
      const hours = onboardingHours.map((hour) => ({
        enabled: Boolean(hour.enabled),
        end_time: hour.end_time,
        start_time: hour.start_time,
        week_day: hour.week_day,
      }));

      if (!hours.some((hour) => hour.enabled)) throw new Error("Ative pelo menos um dia de funcionamento.");

      await callPlatformMaintenance({
        action: "save-hours",
        target_slug: shop.slug,
        working_hours_input: hours,
      });

      await loadDashboard();
      setOnboardingStep(5);
      setMessage("Onboarding concluído. O link da barbearia está pronto para divulgar.");
    } catch (error) {
      rememberError("Onboarding horários", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function fillSelectedShopAddressByCep() {
    if (!selectedShop) return;
    setSaving("cep-shop");
    setMessage("");
    try {
      const address = await fetchCepAddress(selectedShop.cep, selectedShop.address_number);
      updateSelected("address", address);
      setMessage("Endereço encontrado pelo CEP. Confira antes de salvar.");
    } catch (error) {
      rememberError("Buscar CEP da barbearia selecionada", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function syncOwnerAuthUser({ id, slug, email, password, role = "owner" }: OwnerAuthPayload) {
    if (!password) return { skipped: true };

    return syncAdminAuthUser({
      barbershopId: id,
      barbershopSlug: slug,
      email,
      password,
      role,
      active: true,
    });
  }

  async function createShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const ownerPassword = String(newShop.owner_password || "").trim();

    if (ownerPassword.length < 6) {
      setMessage("Informe uma senha inicial do dono com pelo menos 6 caracteres.");
      return;
    }

    setSaving("create");

    try {
      const createPayload = {
        name_input: newShop.name,
        slug_input: newShop.slug || makeSlug(newShop.name),
        whatsapp_input: onlyDigits(newShop.whatsapp),
        owner_email_input: newShop.owner_email,
        plan_input: newShop.plan,
        monthly_status_input: newShop.monthly_status,
        next_billing_date_input: newShop.next_billing_date || null,
        address_input: newShop.address,
        pix_key_input: newShop.pix_key,
        theme_color_input: newShop.theme_color || "#22c55e",
      };

      const { data, error } = (await createBarbershopFull(createPayload)) as {
        data?: CreateShopResult | null;
        error?: unknown;
      };

      let createdData = data || null;
      let createdByMaintenance = false;

      if (error) {
        const createErrorText = errorText(error).toLowerCase();
        const shouldUseMaintenance =
          createErrorText.includes("acesso restrito") ||
          createErrorText.includes("permission denied") ||
          createErrorText.includes("permiss");

        if (!shouldUseMaintenance) throw error;

        const maintenanceCreate = (await callPlatformMaintenance({
          action: "create",
          ...createPayload,
          plan_price_input: Number(newShop.plan_price || 0),
        })) as {
          shop?: CreateShopResult;
        };

        createdData = maintenanceCreate.shop || null;
        createdByMaintenance = true;
      }

      if (!createdByMaintenance) {
        const priceSync = await updatePlatformBarbershop({
          target_slug: newShop.slug || makeSlug(newShop.name),
          name_input: newShop.name,
          whatsapp_input: onlyDigits(newShop.whatsapp),
          owner_email_input: newShop.owner_email,
          plan_input: newShop.plan,
          monthly_status_input: newShop.monthly_status,
          next_billing_date_input: newShop.next_billing_date || null,
          address_input: newShop.address,
          pix_key_input: newShop.pix_key,
          theme_color_input: newShop.theme_color || "#22c55e",
          plan_price_input: Number(newShop.plan_price || 0),
        });

        if (priceSync.error) throw priceSync.error;
      }

      const createdSlug = createdData?.slug || newShop.slug || makeSlug(newShop.name);
      const createdClientLink = createdData?.link_cliente || withAppOrigin(platformOrigin, buildBookingPath(createdSlug));
      const createdPanelLink = createdData?.link_painel || buildPanelPath(createdSlug);

      try {
        await syncOwnerAuthUser({
          id: createdData?.barbershop_id,
          slug: createdSlug,
          email: newShop.owner_email,
          password: ownerPassword,
          role: "owner",
        });
      } catch (authError) {
        setMessage(
          `Barbearia cadastrada, mas o login do dono não foi criado. ${ownerLoginErrorText(
            authError
          )} Corrija a senha na edição da barbearia antes de entregar o painel.`
        );
        await loadDashboard();
        return;
      }

      setMessage(
        `Barbearia cadastrada. Login do dono criado. Cliente: ${createdClientLink} Painel: ${createdPanelLink} Abrindo o painel da barbearia...`
      );
      setNewShop(emptyForm());
      setSlugTouched(false);
      await loadDashboard();
      window.location.assign(createdPanelLink);
    } catch (error) {
      rememberError("Cadastrar barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedShop) return;
    if (!selectedShop.slug) {
      setMessage("Esta barbearia está sem slug. Corrija o cadastro antes de salvar.");
      return;
    }
    setMessage("");

    const ownerPassword = String(selectedShop.owner_password || "").trim();

    if (ownerPassword && ownerPassword.length < 6) {
      setMessage("A nova senha do dono precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (!isAllowedAccessEmailDomain(selectedShop.owner_email || "")) {
      setMessage(allowedAccessEmailMessage);
      return;
    }

    if (!selectedShop.next_billing_date) {
      setMessage("Informe o vencimento da assinatura antes de salvar.");
      return;
    }

    if (Number(selectedShop.plan_price || 0) <= 0) {
      setMessage("Informe o valor mensal do plano antes de salvar.");
      return;
    }

    setSaving("shop");

    try {
      const { error } = await updatePlatformBarbershop({
        target_slug: selectedShop.slug,
        name_input: selectedShop.name,
        whatsapp_input: onlyDigits(selectedShop.whatsapp),
        owner_email_input: selectedShop.owner_email,
        plan_input: selectedShop.plan,
        monthly_status_input: selectedShop.monthly_status,
        next_billing_date_input: selectedShop.next_billing_date || null,
        address_input: selectedShop.address,
        pix_key_input: selectedShop.pix_key,
        theme_color_input: selectedShop.theme_color || "#22c55e",
        plan_price_input: Number(selectedShop.plan_price || 0),
      });

      if (error) throw error;

      if (selectedShop.monthly_status === "archived") {
        const archiveResult = await archivePlatformBarbershop(selectedShop.slug);
        if (archiveResult.error) throw archiveResult.error;
      }

      let loginMessage = "";

      if (ownerPassword) {
        try {
          await syncOwnerAuthUser({
            id: selectedShop.id,
            slug: selectedShop.slug,
            email: selectedShop.owner_email || "",
            password: ownerPassword,
            role: "owner",
          });
          updateSelected("owner_password", "");
          loginMessage = " Login do dono atualizado.";
        } catch (authError) {
          setMessage(
            `Dados da barbearia salvos, mas o login do dono não foi atualizado. ${ownerLoginErrorText(
              authError
            )}`
          );
          await loadDashboard();
          return;
        }
      }

      setMessage(`Barbearia atualizada com sucesso.${loginMessage}`);
      await loadDashboard();
    } catch (error) {
      rememberError("Salvar barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function hideShopFromPlatform(shop: PlatformShopRecord) {
    if (!shop?.slug) return;
    setSaving("hide-" + shop.slug);
    setMessage("");
    try {
      const { error } = await archivePlatformBarbershop(shop.slug);
      if (error) throw error;
      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage("Barbearia removida da lista do painel. Ela continua cadastrada no banco de dados.");
      await loadDashboard();
    } catch (error) {
      rememberError("Arquivar barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function purgeArchivedShops() {
    const archivedCount = archivedShops.length || Number(dashboard.stats?.archived || 0);
    if (!archivedCount) {
      setMessage("Não há barbearias arquivadas para limpar.");
      return;
    }

    const confirmation = window.prompt(
      `Esta ação apaga definitivamente ${archivedCount} barbearia(s) arquivada(s) e seus dados vinculados. Digite LIMPAR para confirmar.`
    );

    if (confirmation !== "LIMPAR") {
      setMessage("Limpeza definitiva cancelada.");
      return;
    }

    setSaving("purge-archived");
    setMessage("");

    try {
      const { data, error } = await purgeArchivedBarbershops();
      if (error) throw error;

      const result = (Array.isArray(data) ? data[0] : data) as PurgeResult | null;
      setSelectedShop(null);
      setMessage(
        `Limpeza concluída. ${result?.deleted_barbershops || 0} barbearia(s), ${result?.deleted_appointments || 0} agendamento(s) e ${result?.deleted_clients || 0} cliente(s) foram removidos.`
      );
      await loadDashboard();
    } catch (error) {
      rememberError("Limpar arquivadas", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveFeatures() {
    if (!selectedShop) return;
    setSaving("features");
    setMessage("");

    try {
      const features = platformFeatures.map((feature) => {
        const released = Boolean(selectedShop.features?.[feature.key]?.released);
        const planAllows = planMeetsFeaturePlan(String(selectedShop.plan || ""), feature.minPlan);

        return {
          feature_key: feature.key,
          released: planAllows && released,
          enabled: planAllows && released && Boolean(selectedShop.features?.[feature.key]?.enabled),
        };
      });

      const { error } = await savePlatformFeatureFlags({
        target_slug: selectedShop.slug,
        features_input: features,
      });

      if (error) throw error;

      setMessage("Funções atualizadas com sucesso.");
      await loadDashboard();
    } catch (error) {
      rememberError("Salvar funções", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function sendBillingReminders() {
    setSaving("reminders");
    setMessage("");

    try {
      const { data, error } = await getPlatformBillingReminders();
      if (error) throw error;

      const reminders = (data || []) as BillingReminder[];
      if (!reminders.length) {
        setMessage("Nenhuma barbearia com vencimento em 3 dias úteis para avisar hoje.");
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const item of reminders) {
        try {
          await sendWhatsappMessage({ to: item.whatsapp, message: item.message });
          await markBillingReminderSent(item.slug);
          sent += 1;
        } catch (_err) {
          failed += 1;
        }
      }

      setMessage(`Avisos de vencimento: ${sent} enviado(s), ${failed} com falha.`);
      await loadDashboard();
    } catch (error) {
      rememberError("Avisos de vencimento", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  function updateSelected<K extends keyof PlatformShopRecord>(field: K, value: PlatformShopRecord[K]) {
    setSelectedShop((current) => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      if (field === "plan") {
        next.plan_price = planPriceFor(String(value));
        next.features = platformFeatures.reduce<PlatformFeatureFlags>((result, feature) => {
          const previous = current.features?.[feature.key] || { enabled: false, released: false };
          const planAllows = planMeetsFeaturePlan(String(value || ""), feature.minPlan);
          result[feature.key] = {
            released: planAllows && Boolean(previous.released),
            enabled: planAllows && Boolean(previous.released) && Boolean(previous.enabled),
          };
          return result;
        }, {});
      }
      return next;
    });
  }

  function updateFeature(key: FeatureKey, field: keyof FeatureFlag, value: boolean) {
    setSelectedShop((current) => {
      if (!current) return current;
      const feature = platformFeatures.find((item) => item.key === key);
      if (!planMeetsFeaturePlan(String(current.plan || ""), feature?.minPlan)) {
        return current;
      }

      const previousFeature = current.features?.[key];
      const nextFeature: FeatureFlag = {
        enabled: Boolean(previousFeature?.enabled),
        released: Boolean(previousFeature?.released),
      };

      if (field === "released") {
        nextFeature.released = value;
        nextFeature.enabled = value ? nextFeature.enabled : false;
      } else {
        nextFeature.enabled = value;
        nextFeature.released = value ? true : nextFeature.released;
      }

      return {
        ...current,
        features: {
          ...(current.features || {}),
          [key]: nextFeature,
        },
      };
    });
  }

  if (checking || loading) {
    return (
      <main className="platformApp">
        <section className="platformHero platformLoginHero platformLoadingHero">
          <img className="platformLoadingLogo" src="/agenda-pro-logo.png" alt="AgendaPro" />
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Carregando acesso e dados da nuvem...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!isDeveloper) {
    return (
      <main className="platformApp">
        <section className="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Entre como desenvolvedor para cadastrar barbearias, liberar funções e administrar planos.</p>
            {message ? <p className="platformNotice">{message}</p> : null}
          </div>
          <div className="platformLoginBox">
            <label>E-mail</label>
            <input
              type="email"
              value={platformLogin.email}
              onChange={(event) => setPlatformLogin({ ...platformLogin, email: event.target.value })}
              placeholder="appagenda.pro@gmail.com"
            />
            <label>Senha</label>
            <div className="passwordRevealField">
              <input
                type={passwordInputType("platform-login")}
                value={platformLogin.password}
                onChange={(event) => setPlatformLogin({ ...platformLogin, password: event.target.value })}
                placeholder="Digite sua senha"
              />
              <button type="button" onClick={() => togglePasswordField("platform-login")}>
                {passwordRevealLabel("platform-login")}
              </button>
            </div>
            <button
              type="button"
              className="platformPrimary platformLoginButton"
              disabled={saving === "platform-login"}
              onClick={loginWithPassword}
            >
              {saving === "platform-login" ? "Entrando..." : "Entrar com e-mail e senha"}
            </button>
            <button type="button" className="platformSecondary platformLoginButton" onClick={login}>
              <GoogleIcon />
              <span>Entrar com Gmail / Google</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="platformApp">
      <header className="platformHero">
        <div>
          <span>Painel Plataforma</span>
          <h1>AgendaPro</h1>
          <p>Controle de barbearias, planos, faturamento e vencimentos.</p>
          {session?.user?.email ? <small>Logado como {session.user.email}</small> : null}
        </div>
        <div className="platformHeroActions">
          <button
            type="button"
            className="platformSecondary"
            onClick={async () => {
              await loadDashboard();
              await checkSystemHealth();
            }}
          >
            Atualizar
          </button>
          <button type="button" className="platformSecondary" disabled={saving === "reminders"} onClick={sendBillingReminders}>{saving === "reminders" ? "Enviando..." : "Enviar avisos de vencimento"}</button>
          <button type="button" className="platformDangerGhost" disabled={saving === "purge-archived" || !(archivedShops.length || Number(dashboard.stats?.archived || 0))} onClick={purgeArchivedShops}>{saving === "purge-archived" ? "Limpando..." : `Limpar arquivadas (${archivedShops.length || dashboard.stats?.archived || 0})`}</button>
          <button type="button" className="platformSecondary" onClick={logout}>Sair</button>
        </div>
      </header>

      {message ? <section className="platformCard platformNoticeCard">{message}</section> : null}

      {platformTab !== "register" && (
        <>
      <section className="platformCard platformHealthOverview">
        <div className="platformTitle">
          <div>
            <span>Saúde da plataforma</span>
            <h2>Receita, crescimento e risco</h2>
          </div>
          <small>Calculado pela nuvem quando o SQL 27 estiver aplicado.</small>
        </div>

        <div className="platformHealthOverviewGrid">
          <StatCard
            label="MRR"
            value={money(dashboard.stats?.mrr ?? dashboard.stats?.monthly_revenue ?? 0)}
            hint="assinaturas ativas"
          />
          <StatCard
            label="Novas barbearias no mês"
            value={dashboard.stats?.new_barbershops_month ?? 0}
            hint="cadastros do mês atual"
          />
          <StatCard
            label="Churn do mês"
            value={dashboard.stats?.churn_month ?? dashboard.stats?.cancelled ?? 0}
            hint="cancelamentos no mês"
          />
          <StatCard
            label="Em risco de churn"
            value={dashboard.stats?.churn_risk ?? 0}
            hint="ativas sem agenda há 30 dias"
          />
        </div>

        <MrrLineChart points={dashboard.stats?.mrr_history || []} />
      </section>

      <section className="platformStats platformStatsPro">
        <StatCard label="Faturamento mensal previsto" value={money(dashboard.stats?.monthly_revenue || 0)} hint="Ativos + teste" />
        <StatCard label="Em atraso" value={money(dashboard.stats?.overdue_revenue || 0)} hint={`${dashboard.stats?.overdue || 0} barbearia(s)`} />
        <StatCard label="Ativas" value={dashboard.stats?.active || shops.filter((shop) => shop.monthly_status === "active").length || 0} hint={`${dashboard.stats?.trial || shops.filter((shop) => shop.monthly_status === "trial").length || 0} em teste`} />
        <StatCard label="Bloqueadas" value={dashboard.stats?.blocked || shops.filter((shop) => shop.monthly_status === "blocked").length || 0} hint={`Próximo: ${dateText(dashboard.stats?.next_billing)}`} />
        <StatCard label="Canceladas" value={dashboard.stats?.cancelled || shops.filter((shop) => shop.monthly_status === "cancelled").length || 0} hint="contratos encerrados" />
        <StatCard label="Arquivadas" value={dashboard.stats?.archived || 0} hint="fora da lista principal" />
      </section>

        </>
      )}

      <section
        ref={platformMenuRef}
        className={platformMenuOpen ? "platformTabs platformTabsOpen" : "platformTabs"}
      >
        <button
          type="button"
          className="platformTabsToggle"
          aria-expanded={platformMenuOpen}
          onClick={() => setPlatformMenuOpen((isOpen) => !isOpen)}
        >
          <span className="hamburgerIcon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="platformMenuLabel">
            <small>Menu da plataforma</small>
            <strong>{currentPlatformTab.label}</strong>
            <em>{currentPlatformTab.description}</em>
          </span>
        </button>

        {platformMenuOpen && (
          <div className="platformTabsMenu" role="menu" aria-label="Seções do Painel Plataforma">
            {platformTabItems.map((tab) => (
              <button
                type="button"
                key={tab.id}
                className={platformTab === tab.id ? "active" : ""}
                onClick={() => {
                  setPlatformTab(tab.id);
                  if (tab.id === "access") loadPlatformAccesses();
                  setPlatformMenuOpen(false);
                }}
                role="menuitem"
              >
                <strong>{tab.label}</strong>
                <span>{tab.description}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {platformTab === "diagnostics" && (
      <section className="platformCard platformHealthCard platformDiagnosticsCard">
        <div className="platformTitle">
          <div>
            <span>Diagnóstico</span>
            <h2>Sistema</h2>
          </div>
          <button
            type="button"
            className="platformSecondary"
            disabled={systemHealth.loading}
            onClick={checkSystemHealth}
          >
            {systemHealth.loading ? "Verificando..." : "Verificar sistema"}
          </button>
        </div>

        <div className="platformDiagnosticActions">
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar RPCs
          </button>
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar Auth
          </button>
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar WhatsApp
          </button>
        </div>

        <div className="platformHealthGrid platformDiagnosticGrid">
          <HealthItem
            label="Supabase conectado"
            tone={systemHealth.supabase?.ok ? "ready" : "danger"}
            status={systemHealth.supabase?.ok ? "Conectado" : "Falha"}
            detail={systemHealth.supabase?.detail || "Aguardando verificação da conexão com a nuvem."}
          />
          <HealthItem
            label="RPCs principais"
            tone={systemHealth.rpc?.ok ? "ready" : "danger"}
            status={systemHealth.rpc?.ok ? "Respondendo" : "Atenção"}
            detail={systemHealth.rpc?.detail || "Testa is_platform_admin e get_platform_dashboard."}
          />
          <HealthItem
            label="Login e senha"
            tone={systemHealth.auth?.serviceRoleConfigured ? "ready" : "danger"}
            status={systemHealth.auth?.serviceRoleConfigured ? "Pronto" : "Atenção"}
            detail={
              systemHealth.auth?.serviceRoleConfigured
                ? "SUPABASE_SERVICE_ROLE_KEY ativa para criar logins de donos."
                : systemHealth.auth?.error || "Falta SUPABASE_SERVICE_ROLE_KEY na Vercel."
            }
          />
          <HealthItem
            label="WhatsApp automático"
            tone={systemHealth.whatsapp?.ready ? "ready" : "warning"}
            status={systemHealth.whatsapp?.ready ? "Pronto" : "Pendente"}
            detail={
              systemHealth.whatsapp?.ready
                ? `${systemHealth.whatsapp?.providerLabel || "WhatsApp Cloud API"} configurado.`
                : (systemHealth.whatsapp?.missing || []).length
                ? `Falta configurar: ${(systemHealth.whatsapp?.missing || []).join(", ")}.`
                : systemHealth.whatsapp?.error || "Aguardando verificação das chaves."
            }
          />
          <HealthItem
            label="Último deploy"
            tone={systemHealth.deploy?.ok ? "ready" : "warning"}
            status={shortCommit(systemHealth.deploy?.commitSha)}
            detail={
              systemHealth.deploy?.ok
                ? `${systemHealth.deploy.environment || "produção"} · ${systemHealth.deploy.branch || "branch não informada"}`
                : systemHealth.deploy?.error || "Endpoint de deploy ainda não verificado."
            }
          />
          <HealthItem
            label="Dados da plataforma"
            tone={systemHealth.data?.total || shops.length ? "ready" : "warning"}
            status={`${systemHealth.data?.total ?? shops.length ?? 0} total`}
            detail={`${systemHealth.data?.active ?? shops.length ?? 0} ativa(s). ${systemHealth.data?.archived ?? archivedShops.length ?? 0} arquivada(s).`}
          />
          <HealthItem
            label="Último erro"
            tone={lastError ? "danger" : "ready"}
            status={lastError ? "Registrado" : "Sem erro recente"}
            detail={lastError || "Nenhum erro capturado nesta sessão do painel."}
          />
        </div>

        <div className="platformPermissionMatrix">
          <div className="platformTitle compactTitle">
            <div>
              <span>Permissões</span>
              <h3>Teste prático por cargo</h3>
            </div>
          </div>

          {permissionScenarioMatrix().map((scenario) => (
            <article className="platformPermissionCard" key={scenario.role}>
              <div>
                <strong>{scenario.label}</strong>
                <small>{scenario.visibleTabs.join(", ")}</small>
              </div>
              <span className={scenario.canManageBilling ? "readyPill" : "lockedPill"}>
                {scenario.canManageBilling ? "Plano liberado" : "Sem plano"}
              </span>
              <span className={scenario.canManageFeatures ? "readyPill" : "lockedPill"}>
                {scenario.canManageFeatures ? "Melhorias liberadas" : "Sem melhorias"}
              </span>
              <span className={scenario.canManageSensitiveAccount ? "readyPill" : "lockedPill"}>
                {scenario.canManageSensitiveAccount ? "Conta sensível" : "Conta limitada"}
              </span>
            </article>
          ))}
        </div>

        <p className="platformHealthFooter">
          {systemHealth.checkedAt
            ? `Última verificação: ${systemHealth.checkedAt}.`
            : "Clique em verificar para atualizar o diagnóstico."}
        </p>
      </section>
      )}

      {platformTab === "access" && (
        <section className="platformAccessGrid">
          <article className="platformCard platformAccessCard">
            <div className="platformTitle">
              <div>
                <span>Acesso atual</span>
                <h2>Minha senha</h2>
              </div>
            </div>

            <p className="platformMuted">
              Defina uma senha para o e-mail logado. Depois disso, voce pode entrar no Painel Plataforma por
              e-mail e senha, sem depender do login Google.
            </p>

            <label>E-mail logado</label>
            <input value={session?.user?.email || ""} readOnly />

            <label>Nova senha</label>
            <div className="passwordRevealField">
              <input
                type={passwordInputType("platform-own-next")}
                autoComplete="new-password"
                value={platformPasswordForm.next}
                onChange={(event) =>
                  setPlatformPasswordForm({ ...platformPasswordForm, next: event.target.value })
                }
                placeholder="minimo 6 caracteres"
              />
              <button type="button" onClick={() => togglePasswordField("platform-own-next")}>
                {passwordRevealLabel("platform-own-next")}
              </button>
            </div>

            <label>Confirmar nova senha</label>
            <div className="passwordRevealField">
              <input
                type={passwordInputType("platform-own-confirm")}
                autoComplete="new-password"
                value={platformPasswordForm.confirm}
                onChange={(event) =>
                  setPlatformPasswordForm({ ...platformPasswordForm, confirm: event.target.value })
                }
                placeholder="repita a nova senha"
              />
              <button type="button" onClick={() => togglePasswordField("platform-own-confirm")}>
                {passwordRevealLabel("platform-own-confirm")}
              </button>
            </div>

            <button
              type="button"
              className="platformPrimary"
              disabled={saving === "platform-password"}
              onClick={updatePlatformOwnPassword}
            >
              {saving === "platform-password" ? "Salvando senha..." : "Alterar minha senha"}
            </button>
          </article>

          <article className="platformCard platformAccessCard">
            <div className="platformTitle">
              <div>
                <span>Desenvolvedores</span>
                <h2>Novo acesso ao painel</h2>
              </div>
            </div>

            <p className="platformMuted">
              Cadastre outro e-mail desenvolvedor. Ele tera acesso ao Painel Plataforma e aos paineis das
              barbearias cadastradas.
            </p>

            <form className="platformForm" onSubmit={savePlatformAccess}>
              <label>E-mail do novo acesso</label>
              <input
                type="email"
                value={platformAccessForm.email}
                onChange={(event) =>
                  setPlatformAccessForm({ ...platformAccessForm, email: event.target.value })
                }
                placeholder="novo@email.com"
                required
              />

              <label>Senha inicial</label>
              <div className="passwordRevealField">
                <input
                  type={passwordInputType("platform-access-password")}
                  autoComplete="new-password"
                  value={platformAccessForm.password}
                  onChange={(event) =>
                    setPlatformAccessForm({ ...platformAccessForm, password: event.target.value })
                  }
                  placeholder="minimo 6 caracteres"
                  minLength={6}
                  required
                />
                <button type="button" onClick={() => togglePasswordField("platform-access-password")}>
                  {passwordRevealLabel("platform-access-password")}
                </button>
              </div>

              <label>Confirmar senha</label>
              <div className="passwordRevealField">
                <input
                  type={passwordInputType("platform-access-confirm")}
                  autoComplete="new-password"
                  value={platformAccessForm.confirm}
                  onChange={(event) =>
                    setPlatformAccessForm({ ...platformAccessForm, confirm: event.target.value })
                  }
                  placeholder="repita a senha"
                  minLength={6}
                  required
                />
                <button type="button" onClick={() => togglePasswordField("platform-access-confirm")}>
                  {passwordRevealLabel("platform-access-confirm")}
                </button>
              </div>

              <label className="platformCheckLine">
                <input
                  type="checkbox"
                  checked={platformAccessForm.active}
                  onChange={(event) =>
                    setPlatformAccessForm({ ...platformAccessForm, active: event.target.checked })
                  }
                />
                Acesso ativo
              </label>

              <button
                type="submit"
                className="platformPrimary"
                disabled={saving === "platform-access"}
              >
                {saving === "platform-access" ? "Salvando acesso..." : "Salvar acesso desenvolvedor"}
              </button>
            </form>
          </article>

          <article className="platformCard platformAccessCard platformAccessListCard">
            <div className="platformTitle">
              <div>
                <span>Autonomia</span>
                <h2>Acessos cadastrados</h2>
              </div>
              <button type="button" className="platformSecondary" onClick={loadPlatformAccesses}>
                Atualizar lista
              </button>
            </div>

            <div className="platformAccessList">
              {platformAccesses.length ? (
                platformAccesses.map((access) => {
                  const email = String(access.email || "").toLowerCase();
                  const protectedAccess =
                    email === "dyoser2@gmail.com" || email === "appagenda.pro@gmail.com";

                  return (
                    <div className="platformAccessItem" key={email}>
                      <div>
                        <strong>{email}</strong>
                        <span>{access.active === false ? "Inativo" : "Ativo"}</span>
                        {access.created_at ? (
                          <small>Criado em {new Date(access.created_at).toLocaleDateString("pt-BR")}</small>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="platformDangerGhost"
                        disabled={
                          protectedAccess ||
                          saving === "disable-platform-" + email ||
                          access.active === false
                        }
                        onClick={() => disablePlatformAccess(email)}
                      >
                        {saving === "disable-platform-" + email ? "Desativando..." : "Desativar"}
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="platformMuted">Clique em atualizar lista para puxar os acessos da nuvem.</p>
              )}
            </div>
          </article>
        </section>
      )}

      {(platformTab === "register" || platformTab === "barbershops") && (
      <>

      {platformTab === "barbershops" && (
      <section className="platformFilters">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button>
        <button type="button" className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Ativas</button>
        <button type="button" className={filter === "trial" ? "active" : ""} onClick={() => setFilter("trial")}>Teste</button>
        <button type="button" className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pendentes</button>
        <button type="button" className={filter === "overdue" ? "active" : ""} onClick={() => setFilter("overdue")}>Atrasadas</button>
        <button type="button" className={filter === "blocked" ? "active" : ""} onClick={() => setFilter("blocked")}>Bloqueadas</button>
        <button type="button" className={filter === "cancelled" ? "active" : ""} onClick={() => setFilter("cancelled")}>Canceladas</button>
      </section>
      )}

      <section
        className={
          platformTab === "register"
            ? "platformGrid platformRegisterGrid"
            : "platformGrid platformBarbershopsGrid"
        }
      >
        {platformTab === "register" && (
        <div ref={onboardingCardRef} className="platformCard platformNewShopCard platformOnboardingCard">
          <div className="platformTitle"><div><span>Cadastro</span><h2>Nova barbearia</h2></div></div>
          <div className="platformWizardSteps" aria-label="Etapas do cadastro">
            {onboardingSteps.map((step, index) => {
              const stepNumber = index + 1;
              return (
                <button
                  type="button"
                  className={[
                    "platformWizardStep",
                    onboardingStep === stepNumber ? "active" : "",
                    onboardingStep > stepNumber ? "done" : "",
                  ].join(" ")}
                  key={step}
                  onClick={() => {
                    if (stepNumber === 1 || onboardingCreated || stepNumber <= onboardingStep) {
                      setOnboardingStep(stepNumber);
                    }
                  }}
                >
                  <span>{stepNumber}</span>
                  {step}
                </button>
              );
            })}
          </div>
          <div className="platformWizardProgress"><span style={{ width: `${Math.max(20, onboardingStep * 20)}%` }} /></div>

          {onboardingStep === 1 && (
            <section className="platformWizardPanel platformForm">
              <div className="platformWizardIntro">
                <span>Etapa 1</span>
                <h3>Dados básicos</h3>
                <p>Crie a barbearia, o acesso do dono e a identidade inicial sem perder o progresso.</p>
              </div>

              <div className="platformSetupChecklist">
                <strong>Checklist comercial</strong>
                <span>Barbearia, e-mail do dono, senha inicial, plano, vencimento e valor mensal precisam estar definidos.</span>
              </div>

              <label>Nome da barbearia</label>
              <input value={newShop.name} onChange={(event) => updateNewShop("name", event.target.value)} placeholder="Master Barbearia" />
              <label>Slug do link</label>
              <input value={newShop.slug} onChange={(event) => { setSlugTouched(true); updateNewShop("slug", event.target.value); }} placeholder="master-barbearia" />
              <div className="platformTwoCols">
                <span><label>WhatsApp</label><input value={newShop.whatsapp} onChange={(event) => updateNewShop("whatsapp", event.target.value)} placeholder="51999999999" /></span>
                <span><label>Cor principal</label><input value={newShop.theme_color} onChange={(event) => updateNewShop("theme_color", event.target.value)} type="color" /></span>
              </div>
              <label>E-mail do dono</label>
              <input value={newShop.owner_email} onChange={(event) => updateNewShop("owner_email", event.target.value)} type="email" placeholder="dono@gmail.com" />
              <label>Senha inicial do dono</label>
              <div className="passwordRevealField">
                <input value={newShop.owner_password || ""} onChange={(event) => updateNewShop("owner_password", event.target.value)} type={passwordInputType("new-shop-owner")} autoComplete="new-password" minLength={6} placeholder="mínimo 6 caracteres" />
                <button type="button" onClick={() => togglePasswordField("new-shop-owner")}>
                  {passwordRevealLabel("new-shop-owner")}
                </button>
              </div>
              <div className="platformTwoCols">
                <span><label>Plano</label><select value={newShop.plan} onChange={(event) => updateNewShop("plan", event.target.value)}>{planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></span>
                <span><label>Status</label><select value={newShop.monthly_status} onChange={(event) => updateNewShop("monthly_status", event.target.value as SubscriptionStatus)}>{creationStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
              </div>
              <div className="platformTwoCols">
                <span><label>Vencimento</label><input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={newShop.plan_price || ""} onChange={(event) => updateNewShop("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>
              <div className="platformTwoCols">
                <span><label>CEP</label><input value={newShop.cep || ""} onChange={(event) => updateNewShop("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
                <span><label>Número</label><input value={newShop.address_number || ""} onChange={(event) => updateNewShop("address_number", event.target.value)} placeholder="123" /></span>
              </div>
              <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-create"} onClick={fillNewShopAddressByCep}>{saving === "cep-create" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
              <label>Endereço completo</label>
              <input value={newShop.address} onChange={(event) => updateNewShop("address", event.target.value)} placeholder="Rua, número - bairro - cidade" />
              <label>Logo ou foto da marca</label>
              <input type="file" accept="image/*" onChange={handleNewShopLogoUpload} />
              {newShop.logo_url ? (
                <div className="platformWizardLogoPreview">
                  <img src={newShop.logo_url} alt="Logo da nova barbearia" />
                  <div><strong>{newShop.name || "Nova barbearia"}</strong><span>Prévia da marca</span></div>
                </div>
              ) : null}
              <label>Chave PIX</label>
              <input value={newShop.pix_key} onChange={(event) => updateNewShop("pix_key", event.target.value)} placeholder="CPF, CNPJ, e-mail ou telefone" />
              <button type="button" className="platformPrimary" disabled={saving === "onboarding-basic"} onClick={saveOnboardingBasic}>
                {saving === "onboarding-basic" ? "Salvando..." : "Salvar e continuar"}
              </button>
            </section>
          )}

          {onboardingStep === 2 && (
            <section className="platformWizardPanel platformForm">
              <div className="platformWizardIntro"><span>Etapa 2</span><h3>Serviços</h3><p>Adicione nome, duração e preço. Estes serviços aparecem na tela do cliente.</p></div>
              <div className="platformWizardList">
                {onboardingServices.map((service, index) => (
                  <article className="platformWizardServiceCard" key={index}>
                    <div className="platformWizardItemTop">
                      <strong>Serviço {index + 1}</strong>
                      <button type="button" className="platformDangerGhost" disabled={onboardingServices.length === 1} onClick={() => setOnboardingServices((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Excluir</button>
                    </div>
                    <label>Nome</label>
                    <input value={service.name} onChange={(event) => updateOnboardingService(index, "name", event.target.value)} placeholder="Corte de cabelo" />
                    <div className="platformTwoCols">
                      <span><label>Duração (min)</label><input value={service.duration} onChange={(event) => updateOnboardingService(index, "duration", event.target.value)} type="number" min="5" step="5" /></span>
                      <span><label>Preço</label><input value={service.price} onChange={(event) => updateOnboardingService(index, "price", event.target.value)} type="number" min="0" step="1" /></span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="platformWizardActions">
                <button type="button" className="platformSecondary" onClick={() => setOnboardingServices((current) => current.concat({ name: "", duration: 30, price: 0 }))}>+ Adicionar serviço</button>
                <button type="button" className="platformPrimary" disabled={saving === "onboarding-services"} onClick={saveOnboardingServices}>{saving === "onboarding-services" ? "Salvando..." : "Salvar serviços"}</button>
              </div>
            </section>
          )}

          {onboardingStep === 3 && (
            <section className="platformWizardPanel platformForm">
              <div className="platformWizardIntro"><span>Etapa 3</span><h3>Equipe</h3><p>Adicione barbeiros com foto opcional. Se for uma barbearia solo, pode pular.</p></div>
              <div className="platformWizardList">
                {onboardingProfessionals.map((professional, index) => (
                  <article className="platformWizardTeamCard" key={index}>
                    <div className="platformWizardItemTop">
                      <strong>Profissional {index + 1}</strong>
                      <button type="button" className="platformDangerGhost" disabled={onboardingProfessionals.length === 1} onClick={() => setOnboardingProfessionals((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Excluir</button>
                    </div>
                    <label>Nome</label>
                    <input value={professional.name} onChange={(event) => updateOnboardingProfessional(index, "name", event.target.value)} placeholder="Cristian" />
                    <label>Foto opcional</label>
                    <input type="file" accept="image/*" onChange={(event) => handleOnboardingProfessionalPhoto(index, event.target.files?.[0])} />
                    {professional.photo_url ? <div className="platformWizardAvatarPreview"><img src={professional.photo_url} alt={professional.name || "Profissional"} /><span>{professional.name || "Profissional"}</span></div> : null}
                  </article>
                ))}
              </div>
              <div className="platformWizardActions">
                <button type="button" className="platformSecondary" onClick={() => setOnboardingProfessionals((current) => current.concat({ name: "", photo_url: "" }))}>+ Adicionar barbeiro</button>
                <button type="button" className="platformSecondary" disabled={saving === "onboarding-professionals"} onClick={() => saveOnboardingProfessionals(true)}>Pular, é solo</button>
                <button type="button" className="platformPrimary" disabled={saving === "onboarding-professionals"} onClick={() => saveOnboardingProfessionals(false)}>{saving === "onboarding-professionals" ? "Salvando..." : "Salvar equipe"}</button>
              </div>
            </section>
          )}

          {onboardingStep === 4 && (
            <section className="platformWizardPanel platformForm">
              <div className="platformWizardIntro"><span>Etapa 4</span><h3>Horários</h3><p>Defina a grade semanal. Os horários serão usados pela agenda real da barbearia.</p></div>
              <div className="platformWizardHoursGrid">
                {onboardingHours.map((hour, index) => (
                  <article className={hour.enabled ? "platformWizardDay active" : "platformWizardDay"} key={hour.week_day}>
                    <button type="button" onClick={() => updateOnboardingHour(index, "enabled", !hour.enabled)}>{hour.enabled ? "Ativo" : "Fechado"}</button>
                    <strong>{weekDayLabels[hour.week_day]}</strong>
                    <div className="platformTwoCols">
                      <span><label>Abertura</label><input value={hour.start_time} onChange={(event) => updateOnboardingHour(index, "start_time", event.target.value)} type="time" disabled={!hour.enabled} /></span>
                      <span><label>Fechamento</label><input value={hour.end_time} onChange={(event) => updateOnboardingHour(index, "end_time", event.target.value)} type="time" disabled={!hour.enabled} /></span>
                    </div>
                  </article>
                ))}
              </div>
              <div className="platformWizardActions">
                <button type="button" className="platformSecondary" onClick={() => setOnboardingStep(3)}>Voltar</button>
                <button type="button" className="platformPrimary" disabled={saving === "onboarding-hours"} onClick={saveOnboardingHours}>{saving === "onboarding-hours" ? "Salvando..." : "Salvar horários"}</button>
              </div>
            </section>
          )}

          {onboardingStep === 5 && (
            <section className="platformWizardPanel platformWizardDone">
              <div className="platformWizardIntro"><span>Etapa 5</span><h3>Pronto!</h3><p>A barbearia já tem link de agendamento e painel. Agora é só divulgar e ajustar detalhes se quiser.</p></div>
              <div className="platformWizardDoneLinks">
                <article><span>Link de agendamento</span><strong>{onboardingClientLink || "Salve as etapas para gerar o link"}</strong><button type="button" className="platformSecondary" disabled={!onboardingClientLink} onClick={() => copyText(onboardingClientLink, "Link de agendamento")}>Copiar link</button></article>
                <article><span>Painel da barbearia</span><strong>{onboardingPanelLink || "Salve as etapas para gerar o painel"}</strong><a className="platformSecondary" href={onboardingPanelLink || "#"} target="_blank" rel="noreferrer">Abrir painel</a></article>
              </div>
              <div className="platformWizardActions">
                <a className="platformPrimary" href={`https://wa.me/?text=${encodeURIComponent(`Agende seu horário online: ${onboardingClientLink}`)}`} target="_blank" rel="noreferrer">Compartilhar no WhatsApp</a>
                <a className="platformSecondary" href={onboardingClientLink || "#"} target="_blank" rel="noreferrer">Abrir agenda</a>
                <button type="button" className="platformSecondary" onClick={resetOnboardingWizard}>Cadastrar outra</button>
              </div>
            </section>
          )}
          {false && (
          <form className="platformForm" onSubmit={createShop}>
            <label>Nome da barbearia</label>
            <input value={newShop.name} onChange={(event) => updateNewShop("name", event.target.value)} placeholder="Barbearia do João" required />
            <label>Slug do link</label>
            <input value={newShop.slug} onChange={(event) => { setSlugTouched(true); updateNewShop("slug", event.target.value); }} placeholder="barbearia-do-joao" />
            <label>WhatsApp</label>
            <input value={newShop.whatsapp} onChange={(event) => updateNewShop("whatsapp", event.target.value)} placeholder="5551999999999" />
            <label>E-mail do dono</label>
            <input value={newShop.owner_email} onChange={(event) => updateNewShop("owner_email", event.target.value)} type="email" placeholder="dono@email.com" required />
            <label>Senha inicial do dono</label>
            <div className="passwordRevealField">
              <input value={newShop.owner_password || ""} onChange={(event) => updateNewShop("owner_password", event.target.value)} type={passwordInputType("legacy-new-shop-owner")} autoComplete="new-password" minLength={6} placeholder="mínimo 6 caracteres" required />
              <button type="button" onClick={() => togglePasswordField("legacy-new-shop-owner")}>
                {passwordRevealLabel("legacy-new-shop-owner")}
              </button>
            </div>
            <div className="platformTwoCols">
              <span><label>Plano</label><select value={newShop.plan} onChange={(event) => updateNewShop("plan", event.target.value)}>{planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></span>
              <span><label>Status</label><select value={newShop.monthly_status} onChange={(event) => updateNewShop("monthly_status", event.target.value as SubscriptionStatus)}>{creationStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
            </div>
            <div className="platformTwoCols">
              <span><label>Vencimento</label><input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" /></span>
              <span><label>Valor mensal</label><input value={newShop.plan_price || ""} onChange={(event) => updateNewShop("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
            </div>
            <div className="platformTwoCols">
              <span><label>CEP</label><input value={newShop.cep || ""} onChange={(event) => updateNewShop("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
              <span><label>Número do comércio</label><input value={newShop.address_number || ""} onChange={(event) => updateNewShop("address_number", event.target.value)} placeholder="123" /></span>
            </div>
            <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-create"} onClick={fillNewShopAddressByCep}>{saving === "cep-create" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
            <label>Endereço</label>
            <input value={newShop.address} onChange={(event) => updateNewShop("address", event.target.value)} placeholder="Rua, número - bairro" />
            <label>Chave PIX</label>
            <input value={newShop.pix_key} onChange={(event) => updateNewShop("pix_key", event.target.value)} placeholder="CPF, CNPJ, e-mail ou telefone" />
            <label>Cor principal</label>
            <input value={newShop.theme_color} onChange={(event) => updateNewShop("theme_color", event.target.value)} type="color" />
            <button type="submit" className="platformPrimary" disabled={saving === "create"}>{saving === "create" ? "Cadastrando..." : "Cadastrar barbearia"}</button>
          </form>
          )}
        </div>
        )}

        {platformTab === "barbershops" && (
        <div className="platformCard">
          <div className="platformTitle"><div><span>Clientes</span><h2>Barbearias cadastradas</h2></div></div>
          <div className="platformShopList">
            {filteredShops.length ? filteredShops.map((shop) => (
              <article className="platformShop platformShopPro" key={shop.id || shop.slug}>
                <div>
                  <strong>{shop.name || "Sem nome"}</strong>
                  <span>{shop.slug}</span>
                  <small>
                    {shop.owner_email || "Sem e-mail"}
                    {typeof shop.admin_count === "number" ? ` · ${shop.admin_count} acesso(s)` : ""}
                    {typeof shop.service_count === "number" ? ` · ${shop.service_count} serviço(s)` : ""}
                  </small>
                  <div className="platformShopMeta">
                    <b>{shop.plan_label || planLabel(shop.plan)}</b>
                    <span>{money(shop.plan_price || 0)}/mês</span>
                    <span>Vence: {dateText(shop.next_billing_date)}</span>
                    {typeof shop.days_to_billing === "number" ? <span>{shop.days_to_billing} dia(s)</span> : null}
                  </div>
                </div>
                <div className="platformShopActions">
                  {statusBadge(shop.monthly_status, shop.status_label)}
                  <button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>
                  <a href={buildPanelPath(shop.slug)} target="_blank" rel="noreferrer">Entrar no painel</a>
                  <a href={buildBookingPath(shop.slug)} target="_blank" rel="noreferrer">Link cliente</a>
                  <button type="button" className="platformDanger" disabled={saving === "hide-" + shop.slug} onClick={() => hideShopFromPlatform(shop)}>{saving === "hide-" + shop.slug ? "Removendo..." : "Remover da lista"}</button>
                </div>
              </article>
            )) : <p className="platformMuted">Nenhuma barbearia encontrada nesse filtro.</p>}
          </div>
          {archivedShops.length ? (
            <div className="platformArchiveBox">
              <div className="platformTitle">
                <div>
                  <span>Diagnóstico da nuvem</span>
                  <h3>Barbearias arquivadas</h3>
                </div>
                <button
                  type="button"
                  className="platformDangerGhost"
                  disabled={saving === "purge-archived"}
                  onClick={purgeArchivedShops}
                >
                  {saving === "purge-archived" ? "Limpando..." : "Apagar arquivadas"}
                </button>
              </div>
              <p className="platformMuted">
                Essas barbearias existem no banco, mas ficam escondidas da lista principal. Restaure para voltar a testar e editar.
              </p>
              <div className="platformShopList">
                {archivedShops.map((shop) => (
                  <article className="platformShop platformShopArchived" key={shop.id || shop.slug}>
                    <div>
                      <strong>{shop.name || "Sem nome"}</strong>
                      <span>{shop.slug}</span>
                      <small>{shop.owner_email || "Sem e-mail"} · {shop.admin_count || 0} acesso(s) · {shop.service_count || 0} serviço(s)</small>
                    </div>
                    <div className="platformShopActions">
                      <b className="statusBlocked">Arquivada</b>
                      <button
                        type="button"
                        disabled={saving === "restore-" + (shop.id || shop.slug)}
                        onClick={() => restoreArchivedShop(shop)}
                      >
                        {saving === "restore-" + (shop.id || shop.slug) ? "Restaurando..." : "Restaurar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        )}
      </section>

      {platformTab === "barbershops" && (
      <section className="platformCard" id="platformEditor">
        {!selectedShop ? <p className="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p> : (
          <>
            <div className="platformTitle"><div><span>Edição</span><h2>{selectedShop.name}</h2></div><button type="button" className="platformSecondary" onClick={() => setSelectedShop(null)}>Fechar</button></div>
            <div className="platformEditorHero">
              <div><span>Plano</span><strong>{planLabel(selectedShop.plan)}</strong><small>{money(selectedShop.plan_price || 0)}/mês</small></div>
              <div><span>Status</span><strong>{statusLabel(selectedShop.monthly_status)}</strong><small>{typeof selectedShop.days_to_billing === "number" ? `${selectedShop.days_to_billing} dia(s)` : "sem alerta"}</small></div>
              <div><span>Vencimento</span><strong>{dateText(selectedShop.next_billing_date)}</strong><small>renovação da assinatura</small></div>
              <div><span>Recursos</span><strong>{Object.values(selectedShop.features || {}).filter((item) => item?.released).length}</strong><small>liberados no plano</small></div>
            </div>
            <div className="platformQuickActions">
              <button type="button" onClick={() => updateSelected("monthly_status", "active")}>Marcar ativo</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "trial")}>Teste 30 dias</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "pending")}>Pendente</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "overdue")}>Marcar atraso</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "blocked")}>Bloquear</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "cancelled")}>Cancelar</button>
              <button type="button" onClick={() => updateSelected("next_billing_date", futureDateText(30))}>Renovar +30 dias</button>
            </div>
            <form className="platformForm" onSubmit={saveShop}>
              <div className="platformEditorSection">
                <h3>Dados principais</h3>
              <label>Nome</label><input value={selectedShop.name || ""} onChange={(event) => updateSelected("name", event.target.value)} />
              <label>WhatsApp</label><input value={selectedShop.whatsapp || ""} onChange={(event) => updateSelected("whatsapp", event.target.value)} />
              <label>E-mail do dono</label><input value={selectedShop.owner_email || ""} onChange={(event) => updateSelected("owner_email", event.target.value)} type="email" />
              <label>Nova senha do dono</label>
              <div className="passwordRevealField">
                <input value={selectedShop.owner_password || ""} onChange={(event) => updateSelected("owner_password", event.target.value)} type={passwordInputType("selected-owner-password")} autoComplete="new-password" minLength={6} placeholder="preencha apenas se quiser alterar" />
                <button type="button" onClick={() => togglePasswordField("selected-owner-password")}>
                  {passwordRevealLabel("selected-owner-password")}
                </button>
              </div>
              </div>
              <div className="platformEditorSection">
                <h3>Assinatura</h3>
              <div className="platformTwoCols">
                <span><label>Plano</label><select value={selectedShop.plan || "professional"} onChange={(event) => updateSelected("plan", event.target.value)}>{planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></span>
                <span><label>Status</label><select value={selectedShop.monthly_status || "active"} onChange={(event) => updateSelected("monthly_status", event.target.value)}><option value="pending">Pendente</option>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
              </div>
              <div className="platformTwoCols">
                <span><label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={selectedShop.plan_price ?? ""} onChange={(event) => updateSelected("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>
              </div>
              <div className="platformEditorSection">
                <h3>Endereço e identidade</h3>
              <div className="platformTwoCols">
                <span><label>CEP</label><input value={selectedShop.cep || ""} onChange={(event) => updateSelected("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
                <span><label>Número do comércio</label><input value={selectedShop.address_number || ""} onChange={(event) => updateSelected("address_number", event.target.value)} placeholder="123" /></span>
              </div>
              <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-shop"} onClick={fillSelectedShopAddressByCep}>{saving === "cep-shop" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
              <label>Endereço</label><input value={selectedShop.address || ""} onChange={(event) => updateSelected("address", event.target.value)} />
              <label>Chave PIX</label><input value={selectedShop.pix_key || ""} onChange={(event) => updateSelected("pix_key", event.target.value)} />
              <label>Cor principal</label><input value={selectedShop.theme_color || "#22c55e"} onChange={(event) => updateSelected("theme_color", event.target.value)} type="color" />
              </div>
              <button type="submit" className="platformPrimary" disabled={saving === "shop"}>{saving === "shop" ? "Salvando..." : "Salvar dados da barbearia"}</button>
            </form>
            <div className="platformFeatures">
              <div className="platformFeatureCatalogHeader">
                <div>
                  <span>Controle comercial</span>
                  <h3>Funções liberadas por plano</h3>
                  <p className="platformMuted">
                    Libere, bloqueie, ative ou desative recursos para esta barbearia. Ao salvar,
                    a mudança sincroniza com a aba Melhorias e com o painel do cliente.
                  </p>
                </div>
              </div>
              <div className="platformFeatureGrid">
                {platformFeatures.map((feature) => {
                  const item = selectedShop.features?.[feature.key] || { enabled: false, released: false };
                  const planAllows = planMeetsFeaturePlan(String(selectedShop.plan || ""), feature.minPlan);
                  const upgradeLabel = featureUpgradeLabel(String(selectedShop.plan || ""), feature.minPlan);
                  const released = planAllows && Boolean(item.released);
                  const enabled = planAllows && released && Boolean(item.enabled);
                  const statusText = !planAllows ? upgradeLabel : enabled ? "Ativo" : released ? "Liberado" : "Bloqueado";

                  return (
                    <article
                      className={[
                        "platformFeatureCard",
                        released ? "released" : "",
                        enabled ? "enabled" : "",
                        planAllows ? "" : "upgradeLocked",
                      ].join(" ")}
                      key={feature.key}
                    >
                      <div className="platformFeatureTop">
                        <span className="platformFeaturePlan">Plano {featureMinimumPlanLabel(feature.minPlan)}</span>
                        <span className={enabled ? "platformFeatureStatus active" : released ? "platformFeatureStatus released" : "platformFeatureStatus"}>
                          {statusText}
                        </span>
                      </div>
                      <h4>{feature.title}</h4>
                      <p>{feature.description}</p>
                      <small className="platformFeatureKey">{feature.key}</small>
                      <div className="platformFeatureActions">
                        <button
                          type="button"
                          className={released ? "platformSwitchButton active" : "platformSwitchButton"}
                          disabled={!planAllows}
                          onClick={() => updateFeature(feature.key, "released", !released)}
                        >
                          {!planAllows ? "Upgrade" : released ? "Bloquear" : "Liberar"}
                        </button>
                        <button
                          type="button"
                          className={enabled ? "platformSwitchButton active green" : "platformSwitchButton"}
                          disabled={!planAllows}
                          onClick={() => updateFeature(feature.key, "enabled", !enabled)}
                        >
                          {!planAllows ? "Indisponível" : enabled ? "Desativar" : "Ativar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
              <button type="button" className="platformPrimary" disabled={saving === "features"} onClick={saveFeatures}>{saving === "features" ? "Salvando..." : "Salvar funções"}</button>
            </div>
          </>
        )}
      </section>
      )}
      </>
      )}
    </main>
  );
}
