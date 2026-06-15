import React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  getAuthSession,
  getMyAdminContext,
  loginWithEmailPassword,
  loginWithGoogleRedirect,
  logoutAuth,
  onAuthStateChange,
  syncAdminAuthUser,
  updateCurrentPassword,
} from "./lib/authApi";
import {
  getBarbershopCloudBundle,
  getBarbershopIdBySlug,
  getClientHistory,
  getProfessionalsByBarbershop,
  getPublicAssetUrl,
  saveAppearanceCenter,
  saveBackgroundSettings,
  saveBarbershopAccesses,
  saveBusinessSettings,
  saveFeatureFlags,
  savePremiumAppearance,
  saveProfessionals,
  savePromotionSettings,
  savePromotions,
  saveScheduleSettings,
  uploadAsset,
} from "./lib/barbershopApi";
import {
  bookAppointmentLegacy,
  bookAppointmentV2,
  cancelPublicAppointment,
  checkPublicSlotAvailability,
  getAdminAppointments,
  getPublicAppointment,
  getWhatsappStatus,
  joinWaitlist as joinWaitlistRequest,
  requestPublicReschedule,
  sendWhatsappAppointmentTemplates,
  sendWhatsappMessage,
  updateAppointmentAction,
  updateWaitlistStatus as updateWaitlistStatusRequest,
} from "./lib/appointmentsApi";
import { blocksClientScheduling, planOptions } from "./lib/commercial";
import { normalizeBrazilWhatsapp } from "./lib/phone";
import {
  defaultFeatureFlags,
  featureMinimumPlanLabel,
  normalizeFeatureKey,
  planMeetsFeaturePlan,
  platformFeatures,
} from "./lib/features";
import {
  canAccessAdminTab as canAccessAdminTabByRole,
  canManageAccessAccounts as canManageAccessAccountsByRole,
  canManageBilling as canManageBillingByRole,
  canManageBusinessSettings as canManageBusinessSettingsByRole,
  getVisibleAdminTabs,
  normalizeAdminRole,
} from "./lib/permissions";
import { saveServices as saveServicesRequest, softDeleteService } from "./lib/servicesApi";
import { applyClientBookingSeo, applyGlobalSeo } from "./lib/seo";
import { hasAuthSession } from "./lib/apiCore";
import {
  allowedAccessEmailMessage,
  isAllowedAccessEmailDomain,
  normalizeAccessEmail,
} from "./lib/emailAccess";
import BarberDashboard from "./features/barber-dashboard/BarberDashboard";
import ClientBooking from "./features/client-booking/ClientBooking";
import type { WeekDay } from "./features/barber-dashboard/panels/AgendaPanel";
import type {
  AccessAccount,
  Appointment,
  Barbershop,
  Client,
  FeatureFlags,
  PaymentMode,
  Professional,
  Promotion,
  PromotionType,
  Service,
  WaitlistEntry,
} from "./types/app";
import "./styles.css";

const platformDeveloperEmails = ["dyoser2@gmail.com", "appagenda.pro@gmail.com"];
const primaryPlatformDeveloperEmail = platformDeveloperEmails[0];

type BusinessState = Barbershop & {
  promotionDescription?: string;
  promotionDiscount?: number;
  promotionTitle?: string;
  promotionValue?: number;
};

type LocalAppointment = Appointment & {
  clientName: string;
  date: string;
  duration?: number;
  id: string;
  note?: string;
  professional: string;
  publicToken?: string;
  services: string;
  time: string;
  token?: string;
  total?: number;
};

type LocalWaitlistEntry = WaitlistEntry & {
  clientName: string;
  createdAt: string;
  date: string;
  id: string;
  services: string;
  status: string;
  whatsapp: string;
};

type PublicAppointmentState = LocalAppointment & {
  payment?: string;
  token: string;
};

type NoticeState = {
  message: string;
  title?: string;
  type?: "error" | "success" | "warning" | string;
};

type PasswordFormState = {
  confirm: string;
  next: string;
};

type UnknownRecord = Record<string, unknown>;

function isPlatformDeveloperEmail(value = "") {
  return platformDeveloperEmails.includes(String(value || "").trim().toLowerCase());
}

const firstAvailableProfessionalName = "Primeiro disponível";
const fallbackProfessionalName = "Profissional disponível";

const initialBusiness: BusinessState = {
  name: "AgendaPro",
  logo: "A",
  logoImage: "",
  slug: "demo-barbearia",
  ownerEmail: primaryPlatformDeveloperEmail,
  plan: "professional",
  monthlyStatus: "active",
  nextBillingDate: "2026-06-04",
  whatsapp: "5551996238323",
  address: "Rua Exemplo, 123 - Centro",
  mapsUrl: "",
  themeColor: "#22c55e",
  themeColorSecondary: "#4ade80",
  clientBackgroundUrl: "",
  adminBackgroundUrl: "",
  clientBackgroundOpacity: 0.18,
  adminBackgroundOpacity: 0.12,
  themeMode: "dark",
  welcomeMessage: "Escolha seu atendimento, veja horários disponíveis e agende pelo celular.",
  ratingValue: 5,
  ratingText: "Avaliação informada pela barbearia",
  beforeImageUrl: "",
  processImageUrl: "",
  finalImageUrl: "",
  beforeImageLabel: "Antes",
  processImageLabel: "Processo",
  finalImageLabel: "Final",
  instagramUrl: "",
  proAppearanceMediaEnabled: false,
  proInstagramEnabled: false,
  pixEnabled: true,
  pixKey: "51996238323",
  pixDiscount: 10,
  promotionTitle: "Promoção online",
  promotionDescription: "Desconto especial para agendamentos feitos pelo app.",
  promotionDiscount: 10,
  promotions: [
    {
      id: "promo-online",
      title: "Promoção online",
      description: "Desconto especial para agendamentos feitos pelo app.",
      type: "discount",
      discountPercent: 10,
      discountValue: 0,
      promotionalPrice: 0,
      active: true,
    },
  ],
  automaticConfirmationEnabled: true,
  successTitle: "Agendamento confirmado!",
  successMessage: "Seu horário já está reservado.",
  successFooter: "A barbearia já recebeu os detalhes do atendimento.",
};

const initialAccessAccounts: AccessAccount[] = platformDeveloperEmails.map((email, index) => ({
  id: `developer-local-${index + 1}`,
  email,
  role: "Desenvolvedor",
  active: true,
  fixed: true,
  password: "",
  passwordConfirm: "",
}));

function normalizeRole(value?: string){return normalizeAdminRole(value);}
function roleLabel(value?: string){const r=normalizeRole(value);return r==="desenvolvedor"?"Desenvolvedor":r==="dono"?"Dono":"Funcionário";}
function cloudRoleFromLabel(value?: string){const r=normalizeRole(value);if(r==="desenvolvedor")return"platform";if(r==="dono")return"owner";return"manager";}
function canAccessAdminTab(roleValue: string,tabId: string,isOwnerEmail=false){return canAccessAdminTabByRole(roleValue,tabId,isOwnerEmail);}

const initialServices = [
  { name: "Corte de cabelo", duration: 30, price: 35, active: true },
  { name: "Barba", duration: 20, price: 25, active: true },
  { name: "Sobrancelha", duration: 10, price: 15, active: true },
  { name: "Descoloração", duration: 90, price: 120, active: true },
  { name: "Coloração", duration: 70, price: 100, active: true },
];

const initialProfessionals = [
  { name: firstAvailableProfessionalName, active: true, fixed: true, photoUrl: "" },
];

const weekDays: WeekDay[] = [
  { key: "mon", label: "Segunda", short: "Seg" },
  { key: "tue", label: "Terça", short: "Ter" },
  { key: "wed", label: "Quarta", short: "Qua" },
  { key: "thu", label: "Quinta", short: "Qui" },
  { key: "fri", label: "Sexta", short: "Sex" },
  { key: "sat", label: "Sábado", short: "Sáb" },
  { key: "sun", label: "Domingo", short: "Dom" },
];

const weekMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const initialSchedule = {
  slotInterval: 30,
  workingHours: {
    mon: { enabled: true, start: "08:00", end: "18:00" },
    tue: { enabled: true, start: "08:00", end: "18:00" },
    wed: { enabled: true, start: "08:00", end: "18:00" },
    thu: { enabled: true, start: "08:00", end: "18:00" },
    fri: { enabled: true, start: "08:00", end: "18:00" },
    sat: { enabled: true, start: "08:00", end: "16:00" },
    sun: { enabled: false, start: "08:00", end: "16:00" },
  },
  breaks: [{ id: "break-1", name: "Almoço", start: "12:00", end: "13:00" }],
  daysOff: [],
  blocks: [
    {
      id: "block-1",
      date: getDateAfterDays(0),
      start: "15:00",
      end: "16:00",
      professional: "Todos",
      reason: "Bloqueio manual",
    },
  ],
};

const initialAppointments: LocalAppointment[] = [];

const initialWaitlist: LocalWaitlistEntry[] = [];

const clientHistory = {};

const adminTabs = [
  { id: "dashboard", label: "Painel" },
  { id: "agendaToday", label: "Agenda Hoje" },
  { id: "agenda", label: "Agenda" },
  { id: "agendaPremium", label: "Agenda Premium" },
  { id: "customers", label: "Clientes" },
  { id: "services", label: "Serviços" },
  { id: "professionals", label: "Profissionais" },
  { id: "payments", label: "Pagamentos" },
  { id: "appearance", label: "Aparência" },
  { id: "improvements", label: "Melhorias" },
  { id: "account", label: "Conta" },
];

function initialFeatureFlags() {
  return defaultFeatureFlags();
}

function pad(value) {
  return value < 10 ? "0" + value : String(value);
}

function getDateAfterDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
}

function toDate(dateText) {
  const [year, month, day] = dateText.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${pad(hours)}:${pad(rest)}`;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function formatDate(dateText) {
  return toDate(dateText).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatDateForMessage(dateText) {
  return toDate(dateText).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateOnly(dateText) {
  if (!dateText) return "Sem data cadastrada";

  return toDate(dateText).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function repairText(value) {
  if (typeof value !== "string") return value;

  const fixes: Array<[RegExp, string]> = [
    [/\u00c3\u00a1/g, "á"],
    [/\u00c3 /g, "à"],
    [/\u00c3\u00a3/g, "ã"],
    [/\u00c3\u00a2/g, "â"],
    [/\u00c3\u00a9/g, "é"],
    [/\u00c3\u00aa/g, "ê"],
    [/\u00c3\u00ad/g, "í"],
    [/\u00c3\u00b3/g, "ó"],
    [/\u00c3\u00b4/g, "ô"],
    [/\u00c3\u00b5/g, "õ"],
    [/\u00c3\u00ba/g, "ú"],
    [/\u00c3\u00a7/g, "ç"],
    [/\u00c3\u2030/g, "É"],
    [/\u00c3\u201c/g, "Ó"],
    [/\u00c2\u00ba/g, "º"],
    [/\u00e2\u0153\u201c/g, "✓"],
    [/\u00e2\u2020\u2019/g, "→"],
    [/hor[?\uFFFD]rio/g, "horário"],
    [/Hor[?\uFFFD]rio/g, "Horário"],
    [/j[?\uFFFD]/g, "já"],
    [/J[?\uFFFD]/g, "Já"],
    [/est[?\uFFFD]o/g, "estão"],
    [/est[?\uFFFD]/g, "está"],
    [/n[?\uFFFD]o/g, "não"],
    [/N[?\uFFFD]o/g, "Não"],
    [/servi[?\uFFFD]o/g, "serviço"],
    [/Servi[?\uFFFD]o/g, "Serviço"],
    [/op[?\uFFFD][?\uFFFD]o/g, "opção"],
    [/promo[?\uFFFD][?\uFFFD]o/g, "promoção"],
    [/confirma[?\uFFFD][?\uFFFD]o/g, "confirmação"],
    [/endere[?\uFFFD]o/g, "endereço"],
    [/pre[?\uFFFD]o/g, "preço"],
    [/c[?\uFFFD]digo/g, "código"],
    [/poss[?\uFFFD]vel/g, "possível"],
    [/at[?\uFFFD]/g, "até"],
    [/tamb[?\uFFFD]m/g, "também"],
    [/dispon[?\uFFFD]vel/g, "disponível"],
    [/indispon[?\uFFFD]vel/g, "indisponível"],
  ];

  return fixes.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}

function buildMapsSearchUrl(address = "") {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
}

function normalizeMapsUrl(value = "", address = "") {
  const url = String(value || "").trim();
  if (
    url &&
    !/^https?:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)\/?$/i.test(url)
  ) {
    return url;
  }

  return buildMapsSearchUrl(address);
}

function cloudErrorText(error) {
  if (!error) return "Erro desconhecido.";

  if (typeof error === "string") return repairText(error);

  const pieces = [
    error.message,
    error.details,
    error.hint,
    error.code ? `Código: ${error.code}` : "",
  ].filter(Boolean);

  if (pieces.length > 0) return repairText(pieces.join(" | "));

  try {
    return repairText(JSON.stringify(error));
  } catch {
    return "Erro desconhecido.";
  }
}

function friendlyCloudErrorText(error, fallback = "Não foi possível concluir esta ação agora. Tente novamente.") {
  const detail = cloudErrorText(error).toLowerCase();

  if (
    detail.includes("permission denied") ||
    detail.includes("get_admin_appointments") ||
    detail.includes("rpc") ||
    detail.includes("pgrst") ||
    detail.includes("schema cache")
  ) {
    return fallback;
  }

  if (
    detail.includes("dono ativo") ||
    detail.includes("owner") ||
    detail.includes("at least one")
  ) {
    return "A barbearia precisa manter pelo menos um Dono ativo.";
  }

  if (
    detail.includes("barbearia nao encontrada") ||
    detail.includes("barbearia não encontrada") ||
    detail.includes("barbershop not found")
  ) {
    return "Não encontrei esta barbearia ativa na nuvem. Abra pelo link oficial do painel ou confira o cadastro no Painel Plataforma.";
  }

  if (
    detail.includes("duplicate") ||
    detail.includes("ocupado") ||
    detail.includes("indispon") ||
    detail.includes("conflict")
  ) {
    return "Esse horário acabou de ser reservado. Escolha outro horário.";
  }

  if (
    detail.includes("{") ||
    detail.includes("código:") ||
    detail.includes("code:") ||
    detail.includes("sql") ||
    detail.includes("function public.")
  ) {
    return fallback;
  }

  return repairText(cloudErrorText(error));
}

function dateParts(dateText) {
  const date = toDate(dateText);
  return {
    weekday: date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
    day: pad(date.getDate()),
    month: pad(date.getMonth() + 1),
  };
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);

  if (numbers.length > 7) {
    return numbers.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3").replace(/-$/, "");
  }

  if (numbers.length > 2) {
    return numbers.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  }

  return numbers;
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

const reservedBarbershopSlugs = new Set([
  "agenda-pro",
  "agendapro",
  "api",
  "assets",
  "barbearia",
  "painel",
  "painel-plataforma",
  "plataforma",
  "agendamento",
]);

function isReservedBarbershopSlug(value) {
  const slug = makeSlug(value || "");
  return !slug || reservedBarbershopSlugs.has(slug);
}

function money(value) {
  return roundCurrency(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function roundCurrency(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

function clampPercentage(value, max = 80) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(Math.max(number, 0), max);
}

function currentTimeMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function normalizePromotion(item: unknown, index = 0): Promotion & {
  active: boolean;
  discountPercent: number;
  discountValue: number;
  id: string;
  promotionalPrice: number;
  title: string;
  type: PromotionType;
} {
  const promotion = isPlainObject(item) ? item : {};
  const fallback = initialBusiness.promotions[index] || initialBusiness.promotions[0];

  return {
    id: String(promotion.id || fallback.id || makeId("promo")),
    title: repairText(promotion.title || promotion.name || fallback.title || "Promoção"),
    description: repairText(
      promotion.description || promotion.text || fallback.description || ""
    ),
    type:
      promotion.type === "price" || promotion.kind === "price" || promotion.mode === "price"
        ? "price"
        : "discount",
    discountPercent: clampPercentage(
      promotion.discountPercent ?? promotion.discount ?? promotion.percent ?? fallback.discountPercent ?? 0
    ),
    discountValue: roundCurrency(
      Math.max(Number(promotion.discountValue ?? promotion.discountAmount ?? fallback.discountValue ?? 0), 0)
    ),
    promotionalPrice: roundCurrency(
      Math.max(
        Number(
          promotion.promotionalPrice ??
            promotion.promoPrice ??
            promotion.price ??
            promotion.value ??
            fallback.promotionalPrice ??
            0
        ),
        0
      )
    ),
    active: promotion.active !== false,
  };
}

function normalizePromotions(value: unknown, legacy: UnknownRecord = {}) {
  let list = value;

  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }

  if (Array.isArray(list) && list.length > 0) {
    return list.map((item, index) => normalizePromotion(item, index));
  }

  const legacyTitle = legacy.promotionTitle || legacy.promotion_title || initialBusiness.promotionTitle;
  const legacyDescription =
    legacy.promotionDescription ||
    legacy.promotion_description ||
    initialBusiness.promotionDescription;
  const legacyDiscount = Number(
    legacy.promotionDiscount ?? legacy.promotion_discount ?? initialBusiness.promotionDiscount
  );

  if (legacyTitle || legacyDescription || legacyDiscount > 0) {
    return [
      normalizePromotion({
        id: "promo-online",
        title: legacyTitle,
        description: legacyDescription,
        discountPercent: legacyDiscount,
        discountValue: legacy.promotionValue || legacy.promotion_value || 0,
        active: true,
      }),
    ];
  }

  return initialBusiness.promotions.map((item, index) => normalizePromotion(item, index));
}

function promotionDiscountAmount(promotion, subtotal) {
  if (promotion.type === "price") {
    const price = Number(promotion.promotionalPrice || 0);
    if (price <= 0) return 0;
    return roundCurrency(Math.max(subtotal - price, 0));
  }

  const percentValue = (subtotal * clampPercentage(promotion.discountPercent)) / 100;
  const fixedValue = Number(promotion.discountValue || 0);
  return roundCurrency(Math.max(percentValue, 0) + Math.max(fixedValue, 0));
}

function hexToRgba(hex, opacity) {
  const cleanHex = hex.replace("#", "");
  const red = parseInt(cleanHex.substring(0, 2), 16);
  const green = parseInt(cleanHex.substring(2, 4), 16);
  const blue = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function safeImageUrl(value) {
  const url = String(value || "").trim();
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("data:image/")
    ? url
    : "";
}

const storagePrefix = "agendaProV3";

const storageKeys = {
  business: "business",
  accessAccounts: "accessAccounts",
  featureFlags: "featureFlags",
  services: "services",
  professionals: "professionals",
  schedule: "schedule",
  appointments: "appointments",
  waitlist: "waitlist",
};

function storageKey(key) {
  return `${storagePrefix}:${key}`;
}

function isPlainObject(value: unknown): value is UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value);
}

function textFrom(value: unknown, fallback = "") {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function mergeWithDefault(defaultValue, savedValue) {
  if (Array.isArray(defaultValue)) {
    return Array.isArray(savedValue) ? savedValue : defaultValue;
  }

  if (isPlainObject(defaultValue) && isPlainObject(savedValue)) {
    const result = { ...savedValue };

    Object.keys(defaultValue).forEach((key) => {
      result[key] = key in savedValue
        ? mergeWithDefault(defaultValue[key], savedValue[key])
        : defaultValue[key];
    });

    return result;
  }

  return savedValue === undefined || savedValue === null ? defaultValue : savedValue;
}

function readSavedData(key, fallback){if(typeof window==="undefined")return fallback;const ok=new URLSearchParams(window.location.search).get("localFallback")==="1";if(!ok)return fallback;try{const saved=window.localStorage.getItem(storageKey(key));return saved?mergeWithDefault(fallback,JSON.parse(saved)):fallback;}catch{return fallback;}}

function saveData(key, value){if(typeof window==="undefined")return;const ok=new URLSearchParams(window.location.search).get("localFallback")==="1";if(!ok)return;try{window.localStorage.setItem(storageKey(key),JSON.stringify(value));}catch{console.warn("Não foi possível salvar os dados no navegador.");}}

function removeSavedData() {
  if (typeof window === "undefined") return;

  Object.keys(storageKeys).forEach((key) => {
    window.localStorage.removeItem(storageKey(storageKeys[key]));
  });
}

function shortTime(value) {
  return String(value || "").slice(0, 5);
}

function slugFromPathname(pathname) {
  const parts = String(pathname || "")
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .filter(Boolean);

  const route = String(parts[0] || "").toLowerCase();
  const routePrefixes = ["painel", "agendamento", "barbearia"];
  const reservedRoutes = [
    ...routePrefixes,
    "plataforma",
    "painel-plataforma",
    "api",
    "assets",
  ];

  if (routePrefixes.includes(route)) {
    const prefixedSlug = makeSlug(parts[1] || "");
    return isReservedBarbershopSlug(prefixedSlug) ? "" : prefixedSlug;
  }

  if (!route || reservedRoutes.includes(route) || isReservedBarbershopSlug(route)) {
    return "";
  }

  const bareSlug = makeSlug(parts[0] || "");
  return isReservedBarbershopSlug(bareSlug) ? "" : bareSlug;
}

function currentSlugFromUrl() {
  if (typeof window === "undefined") return "";

  return slugFromPathname(window.location.pathname);
}

function initialViewModeFromUrl() {
  if (typeof window === "undefined") return "client";

  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts.includes("painel") ? "barberGate" : "client";
}

const adminTabStoragePrefix = "agendapro:last-admin-tab:";

function adminTabStorageKey(slug = currentSlugFromUrl()) {
  return `${adminTabStoragePrefix}${slug || "default"}`;
}

function readInitialAdminTab() {
  if (typeof window === "undefined") return "dashboard";

  try {
    return window.localStorage.getItem(adminTabStorageKey()) || "dashboard";
  } catch {
    return "dashboard";
  }
}

function saveInitialAdminTab(tabId, slug = currentSlugFromUrl()) {
  if (typeof window === "undefined" || !tabId) return;

  try {
    window.localStorage.setItem(adminTabStorageKey(slug), tabId);
  } catch {
    // Cache local indisponivel; o painel continua funcionando sem persistir a aba.
  }
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function mapBusinessFromCloud(row, account) {
  return normalizeBusiness(mergeWithDefault(initialBusiness, {
    name: repairText(row.name),
    logo: repairText(row.logo_text || "B"),
    logoImage: row.logo_url || "",
    slug: row.slug,
    ownerEmail: account?.owner_email || "",
    plan: account?.plan || initialBusiness.plan,
    monthlyStatus: account?.monthly_status || initialBusiness.monthlyStatus,
    nextBillingDate: account?.next_billing_date || initialBusiness.nextBillingDate,
    whatsapp: row.whatsapp,
    address: repairText(row.address || ""),
    mapsUrl: normalizeMapsUrl(row.maps_url || "", row.address || ""),
    themeColor: row.theme_color || initialBusiness.themeColor,
    themeColorSecondary: row.theme_color_secondary || initialBusiness.themeColorSecondary,
    clientBackgroundUrl: row.client_background_url || "",
    adminBackgroundUrl: row.admin_background_url || "",
    clientBackgroundOpacity: Number(row.client_background_opacity ?? initialBusiness.clientBackgroundOpacity),
    adminBackgroundOpacity: Number(row.admin_background_opacity ?? initialBusiness.adminBackgroundOpacity),
    themeMode: row.theme_mode === "light" ? "light" : "dark",
    welcomeMessage: repairText(row.welcome_message || initialBusiness.welcomeMessage),
    ratingValue: Number(row.rating_value ?? initialBusiness.ratingValue),
    ratingText: repairText(row.rating_text || initialBusiness.ratingText),
    beforeImageUrl: row.before_image_url || "",
    processImageUrl: row.process_image_url || "",
    finalImageUrl: row.final_image_url || "",
    beforeImageLabel: repairText(row.before_image_label || initialBusiness.beforeImageLabel),
    processImageLabel: repairText(row.process_image_label || initialBusiness.processImageLabel),
    finalImageLabel: repairText(row.final_image_label || initialBusiness.finalImageLabel),
    instagramUrl: row.instagram_url || "",
    proAppearanceMediaEnabled: Boolean(row.pro_appearance_media_enabled),
    proInstagramEnabled: Boolean(row.pro_instagram_enabled),
    pixEnabled: Boolean(row.pix_enabled),
    pixKey: row.pix_key || "",
    pixDiscount: Number(row.pix_discount || 0),
    promotionTitle: repairText(row.promotion_title || initialBusiness.promotionTitle),
    promotionDescription: repairText(
      row.promotion_description || initialBusiness.promotionDescription
    ),
    promotionDiscount: Number(row.promotion_discount || initialBusiness.promotionDiscount),
    promotions: normalizePromotions(row.promotions, {
      promotionTitle: row.promotion_title,
      promotionDescription: row.promotion_description,
      promotionDiscount: row.promotion_discount,
    }),
    automaticConfirmationEnabled: Boolean(row.automatic_confirmation_enabled),
    successTitle: repairText(row.success_title || initialBusiness.successTitle),
    successMessage: repairText(row.success_message || initialBusiness.successMessage),
    successFooter: repairText(row.success_footer || initialBusiness.successFooter),
  }));
}

function normalizeBusiness(value) {
  const business = mergeWithDefault(initialBusiness, value || {});
  const promotions = normalizePromotions(business.promotions, business);
  const primaryPromotion = promotions[0] || initialBusiness.promotions[0];

  return {
    ...business,
    name: repairText(business.name),
    logo: repairText(business.logo),
    address: repairText(business.address),
    mapsUrl: normalizeMapsUrl(business.mapsUrl, business.address),
    promotions,
    promotionTitle: repairText(primaryPromotion.title || business.promotionTitle),
    promotionDescription: repairText(primaryPromotion.description || business.promotionDescription),
    promotionDiscount: Number(primaryPromotion.discountPercent ?? business.promotionDiscount ?? 0),
    themeMode: business.themeMode === "light" ? "light" : "dark",
    welcomeMessage: repairText(business.welcomeMessage || initialBusiness.welcomeMessage),
    ratingValue: Number(business.ratingValue ?? initialBusiness.ratingValue),
    ratingText: repairText(business.ratingText || initialBusiness.ratingText),
    successTitle: repairText(business.successTitle),
    successMessage: repairText(business.successMessage),
    successFooter: repairText(business.successFooter),
  };
}

function mapAccessAccountsFromCloud(rows, ownerEmail) {
  const cloudAccounts = (rows || []).map((item) => {
    const accountEmail = String(item.email || "").trim().toLowerCase();
    const isDeveloper = isPlatformDeveloperEmail(accountEmail) || normalizeRole(item.role) === "desenvolvedor";

    return {
      id: item.id,
      email: item.email,
      role: isDeveloper ? "Desenvolvedor" : roleLabel(item.role),
      active: item.active !== false,
      fixed: isDeveloper,
      password: "",
      passwordConfirm: "",
    };
  });

  function ensureOwnerAccount(accounts) {
    const fallbackOwnerEmail = String(ownerEmail || "").trim().toLowerCase();
    const nextAccounts = [...accounts];

    if (!fallbackOwnerEmail || isPlatformDeveloperEmail(fallbackOwnerEmail)) {
      return nextAccounts;
    }

    const ownerIndex = nextAccounts.findIndex(
      (account) => String(account.email || "").trim().toLowerCase() === fallbackOwnerEmail
    );

    if (ownerIndex === -1) {
      nextAccounts.push({
        id: "owner-local",
        email: fallbackOwnerEmail,
        role: "Dono",
        active: true,
        fixed: false,
        password: "",
        passwordConfirm: "",
      });
      return nextAccounts;
    }

    const ownerAccount = nextAccounts[ownerIndex];

    if (normalizeRole(ownerAccount.role) !== "dono" || ownerAccount.active === false) {
      nextAccounts[ownerIndex] = {
        ...ownerAccount,
        role: "Dono",
        active: true,
      };
    }

    return nextAccounts;
  }

  if (cloudAccounts.length) {
    const accountsWithDevelopers = [...cloudAccounts];

    platformDeveloperEmails
      .slice()
      .reverse()
      .forEach((email, index) => {
        const hasDeveloper = accountsWithDevelopers.some(
          (account) => String(account.email || "").trim().toLowerCase() === email
        );

        if (!hasDeveloper) {
          accountsWithDevelopers.unshift({
            id: `developer-local-${index + 1}`,
            email,
            role: "Desenvolvedor",
            active: true,
            fixed: true,
            password: "",
            passwordConfirm: "",
          });
        }
      });

    return ensureOwnerAccount(accountsWithDevelopers);
  }

  const fallbackAccounts = [...initialAccessAccounts];

  return ensureOwnerAccount(fallbackAccounts);
}

function isActiveOwnerAccessAccount(account) {
  return (
    account &&
    account.active !== false &&
    normalizeRole(account.role) === "dono" &&
    !isPlatformDeveloperEmail(account.email)
  );
}

function countActiveOwnerAccessAccounts(accounts) {
  return (accounts || []).filter(isActiveOwnerAccessAccount).length;
}

function ensureRequiredPanelAccessAccounts(accounts, ownerEmail) {
  const nextAccounts = [...(accounts || [])];
  const normalizedOwnerEmail = String(ownerEmail || "").trim().toLowerCase();

  if (!normalizedOwnerEmail || isPlatformDeveloperEmail(normalizedOwnerEmail)) {
    return nextAccounts;
  }

  const ownerIndex = nextAccounts.findIndex(
    (account) => String(account.email || "").trim().toLowerCase() === normalizedOwnerEmail
  );

  if (ownerIndex === -1) {
    nextAccounts.push({
      id: "owner-local",
      email: normalizedOwnerEmail,
      role: "Dono",
      active: true,
      fixed: false,
      password: "",
      passwordConfirm: "",
    });
    return nextAccounts;
  }

  nextAccounts[ownerIndex] = {
    ...nextAccounts[ownerIndex],
    email: normalizedOwnerEmail,
    role: "Dono",
    active: true,
  };

  return nextAccounts;
}

function mapFeatureFlagsFromCloud(rows) {
  const flags = initialFeatureFlags();

  (rows || []).forEach((item) => {
    const featureKey = normalizeFeatureKey(item.feature_key);

    if (!featureKey) return;

    flags[featureKey] = {
      enabled: Boolean(item.enabled),
      released: Boolean(item.released),
    };
  });

  return flags;
}

function mapWaitlistFromCloud(rows) {
  return (rows || []).map((item) => ({
    id: item.id,
    clientName: item.client_name,
    whatsapp: item.whatsapp,
    date: item.preferred_date,
    services: item.service_text,
    status: item.status || "waiting",
    createdAt: item.created_at,
  }));
}

function mapAppointmentsFromCloud(appointmentRows, professionalRows) {
  const professionalById = {};

  (professionalRows || []).forEach((item) => {
    professionalById[item.id] = item.fixed ? firstAvailableProfessionalName : item.name;
  });

  return (appointmentRows || []).map((item) => ({
    id: item.id,
    clientName: item.client_name,
    whatsapp: item.whatsapp,
    professional: professionalById[item.professional_id] || firstAvailableProfessionalName,
    date: item.appointment_date,
    time: shortTime(item.appointment_time),
    duration: Number(item.duration),
    services: item.service_text,
    total: Number(item.total),
    payment: item.payment_method,
    paid: Boolean(item.paid),
    status: item.status || "confirmed",
    rescheduleRequested: Boolean(item.reschedule_requested),
    publicToken: item.public_token || "",
    note: item.customer_note || "",
  }));
}

function mapServicesFromCloud(rows) {
  const byName = new Map();

  (rows || []).forEach((item, index) => {
    if (item.deleted_at) return;

    const name = String(item.name || "").trim();
    const key = makeSlug(name);

    if (!key || key === "teste-codex") return;

    const mapped = {
      id: item.id,
      name,
      duration: Number(item.duration || 30),
      price: Number(item.price || 0),
      active: Boolean(item.active),
      deletedAt: item.deleted_at || "",
      sortOrder: Number(item.sort_order || index + 1),
      createdAt: item.created_at || "",
    };

    const current = byName.get(key);
    const shouldReplace =
      !current ||
      (mapped.active && !current.active) ||
      (mapped.active === current.active && mapped.sortOrder < current.sortOrder) ||
      (mapped.active === current.active &&
        mapped.sortOrder === current.sortOrder &&
        String(mapped.createdAt) > String(current.createdAt));

    if (shouldReplace) {
      byName.set(key, mapped);
    }
  });

  return Array.from(byName.values())
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ sortOrder, createdAt, ...service }) => service);
}

function mapScheduleFromCloud(workingRows, breakRows, dayOffRows, blockRows, professionalRows, slotInterval) {
  const professionalById = {};
  professionalRows.forEach((item) => {
    professionalById[item.id] = item.name;
  });

  const workingHours = { ...initialSchedule.workingHours };

  workingRows.forEach((item) => {
    const key = weekMap[item.week_day];
    workingHours[key] = {
      enabled: Boolean(item.enabled),
      start: shortTime(item.start_time),
      end: shortTime(item.end_time),
    };
  });

  return {
    ...initialSchedule,
    slotInterval: Number(slotInterval || initialSchedule.slotInterval),
    workingHours,
    breaks: breakRows.map((item) => ({
      id: item.id,
      name: item.name,
      start: shortTime(item.start_time),
      end: shortTime(item.end_time),
    })),
    daysOff: dayOffRows.map((item) => ({
      id: item.id,
      date: item.date,
      reason: item.reason || "Folga",
    })),
    blocks: blockRows.map((item) => ({
      id: item.id,
      date: item.date,
      start: shortTime(item.start_time),
      end: shortTime(item.end_time),
      professional: item.professional_id ? professionalById[item.professional_id] || "Todos" : "Todos",
      reason: item.reason || "Bloqueio manual",
    })),
  };
}

function CoreAgendaProApp() {
  const [viewMode, setViewMode] = useState(() => initialViewModeFromUrl());
  const [adminTab, setAdminTab] = useState(() => readInitialAdminTab());
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  useEffect(()=>{if(typeof window!=="undefined"){window.__agendaProAdminTab=adminTab;window.__agendaProViewMode=viewMode;window.__agendaProAdminLoggedIn=adminLoggedIn;}},[adminTab,viewMode,adminLoggedIn]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminContext, setAdminContext] = useState<UnknownRecord | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>({ next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordEditorOpen, setPasswordEditorOpen] = useState<Record<string, boolean>>({});
  const [barberGateWhatsapp, setBarberGateWhatsapp] = useState("");
  const [barberGateName, setBarberGateName] = useState("");
  const [barberGateError, setBarberGateError] = useState("");
  const [screen, setScreen] = useState("home");
  const [business, setBusiness] = useState<BusinessState>(() =>
    normalizeBusiness(readSavedData(storageKeys.business, initialBusiness))
  );
  const [accessAccounts, setAccessAccounts] = useState<AccessAccount[]>(() =>
    readSavedData(storageKeys.accessAccounts, initialAccessAccounts)
  );
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(() =>
    readSavedData(storageKeys.featureFlags, initialFeatureFlags())
  );
  const [services, setServices] = useState<Service[]>(() =>
    readSavedData(storageKeys.services, initialServices)
  );
  const [professionals, setProfessionals] = useState<Professional[]>(() =>
    readSavedData(storageKeys.professionals, initialProfessionals)
  );
  const [schedule, setSchedule] = useState<typeof initialSchedule>(() =>
    readSavedData(storageKeys.schedule, initialSchedule)
  );
  const [appointments, setAppointments] = useState<LocalAppointment[]>(() =>
    readSavedData(storageKeys.appointments, initialAppointments)
  );
  const [waitlist, setWaitlist] = useState<LocalWaitlistEntry[]>(() =>
    readSavedData(storageKeys.waitlist, initialWaitlist)
  );
  const [whatsapp, setWhatsapp] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedPromotions, setSelectedPromotions] = useState<string[]>([]);
  const [professional, setProfessional] = useState(firstAvailableProfessionalName);
  const [range, setRange] = useState("today");
  const [selectedDate, setSelectedDate] = useState(getDateAfterDays(0));
  const [selectedTime, setSelectedTime] = useState("");
  const [payment, setPayment] = useState<PaymentMode>("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [promotionsOpen, setPromotionsOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [confirmedToken, setConfirmedToken] = useState("");
  const [publicAppointment, setPublicAppointment] = useState<PublicAppointmentState | null>(null);
  const [publicAppointmentToken, setPublicAppointmentToken] = useState("");
  const [publicActionSaving, setPublicActionSaving] = useState("");
  const [dataSavedAt, setDataSavedAt] = useState("");
  const [barbershopId, setBarbershopId] = useState("");
  const [cloudSlug, setCloudSlug] = useState(currentSlugFromUrl());
  const [cloudLoadState, setCloudLoadState] = useState("loading");
  const [cloudStatus, setCloudStatus] = useState("Conectando à nuvem...");
  const [cloudSaving,setRawCloudSaving]=useState("");
  function setCloudSaving(value){setRawCloudSaving(value);if(value&&typeof window!=="undefined"){window.setTimeout(()=>setRawCloudSaving(c=>c===value?"":c),12000);}}
  const [cloudHistory, setCloudHistory] = useState<UnknownRecord | null>(null);
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [barberConfirmationMessage, setBarberConfirmationMessage] = useState("");
  const [whatsappIntegrationStatus, setWhatsappIntegrationStatus] = useState({
    checked: false,
    ready: false,
    provider: "meta",
    providerLabel: "WhatsApp Cloud API",
    message: "Verificação pendente",
    missing: [],
  });

  const today = getDateAfterDays(0);
  const cleanWhatsapp = whatsapp.replace(/\D/g, "");
  const history = cloudHistory || clientHistory[cleanWhatsapp];
  const currentPlan = planOptions.find((plan) => plan.id === business.plan) || planOptions[0];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://agenda.app";
  const routeSlug = makeSlug(
    loadedCloudSlug() || business.slug || cloudSlug || currentSlugFromUrl()
  );
  const publicScheduleLink = `${appOrigin}/agendamento/${routeSlug || "barbearia"}`;
  const adminPanelLink = `${appOrigin}/painel/${routeSlug || "barbearia"}`;
  function featurePlanAllowed(featureKey) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);
    const feature = platformFeatures.find((item) => item.key === normalizedFeatureKey);

    return planMeetsFeaturePlan(business.plan, feature?.minPlan);
  }

  function featureIsAvailable(featureKey) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);

    if (!normalizedFeatureKey) return false;

    const featureState = featureFlags[normalizedFeatureKey];

    return Boolean(
      featureState?.released &&
        featureState?.enabled &&
        featurePlanAllowed(normalizedFeatureKey)
    );
  }

  const uniqueLinkAvailable = featureIsAvailable("unique_link");
  const appointmentManagementLink = uniqueLinkAvailable && confirmedToken
    ? `${publicScheduleLink}?agendamento=${encodeURIComponent(confirmedToken)}`
    : "";
  const scheduleBlocked = blocksClientScheduling(business.monthlyStatus);
  const pixFeatureEnabled = featureIsAvailable("pix");
  const autoConfirmationFeatureEnabled = featureIsAvailable("auto_confirmation");
  const pixAvailable = business.pixEnabled && pixFeatureEnabled;
  const waitlistAvailable = featureIsAvailable("waitlist");
  const visualAgendaAvailable = featureIsAvailable("visual_agenda");
  const appearanceMediaAvailable =
    featurePlanAllowed("appearance_media") &&
    (Boolean(business.proAppearanceMediaEnabled) || featureIsAvailable("appearance_media"));
  const commissionsAvailable = featureIsAvailable("commissions");
  const normalizedAdminEmail = adminEmail.trim().toLowerCase();
  const normalizedOwnerEmail = (business.ownerEmail || initialBusiness.ownerEmail)
    .trim()
    .toLowerCase();
  const currentAdminAccount = accessAccounts.find(
    (account) => account.email.trim().toLowerCase() === normalizedAdminEmail
  );
  const isPlatformAdminSession = adminContext?.access_type === "platform";
  const isOwnerEmail = normalizedAdminEmail === normalizedOwnerEmail;
  const currentAdminRole = isPlatformAdminSession
    ? "desenvolvedor"
    : isOwnerEmail
    ? "dono"
    : normalizeRole(currentAdminAccount?.role);
  const isDeveloperRole = currentAdminRole === "desenvolvedor";
  const isOwnerRole = currentAdminRole === "dono" || isOwnerEmail;
  const canManageBilling = canManageBillingByRole(currentAdminRole);
  const canManageAccessAccounts = canManageAccessAccountsByRole(currentAdminRole, isOwnerEmail);
  const canManageBusinessSettings = canManageBusinessSettingsByRole(currentAdminRole, isOwnerEmail);
  const canUseAdminTab = (tabId) => canAccessAdminTab(currentAdminRole, tabId, isOwnerEmail);
  const visibleAdminTabs = getVisibleAdminTabs(adminTabs, currentAdminRole, isOwnerEmail);
  const activeAdminTab = canUseAdminTab(adminTab) ? adminTab : "dashboard";

  useEffect(() => {
    if (adminLoggedIn && adminTab !== activeAdminTab) {
      setAdminTab(activeAdminTab);
    }

    if (typeof window !== "undefined") {
      window.__agendaProAdminTab = activeAdminTab;

      const isPanelRoute = window.location.pathname
        .split("/")
        .filter(Boolean)
        .includes("painel");
      const activeSlug = loadedCloudSlug() || currentSlugFromUrl();

      if (adminLoggedIn && isPanelRoute) {
        saveInitialAdminTab(activeAdminTab, activeSlug);
      }
    }
  }, [activeAdminTab, adminLoggedIn, adminTab]);

  useEffect(() => {
    if (!adminLoggedIn) return;

    refreshWhatsappIntegrationStatus();
  }, [adminLoggedIn]);

  function handleClearLocalCache() {
    removeSavedData();
    setNotice({ type: "success", message: "Cache local limpo. Recarregando dados da nuvem..." });
    window.setTimeout(() => window.location.reload(), 350);
  }

  function isAdminEmailAllowed(email: string) {
    const normalizedEmail = normalizeAccessEmail(email);

    if (!isAllowedAccessEmailDomain(normalizedEmail)) {
      return false;
    }

    return (
      normalizedEmail === normalizeAccessEmail(business.ownerEmail) ||
      accessAccounts.some(
        (account) => account.active && normalizeAccessEmail(account.email) === normalizedEmail
      )
    );
  }

  function enterAdminWithEmail(email: string, options: { resetTab?: boolean } = {}) {
    const resetTab = options.resetTab !== false;

    setAdminEmail(email || "");
    setAdminLoggedIn(true);
    setAdminLoginError("");
    setBarberGateError("");
    if (resetTab) {
      setAdminTab(readInitialAdminTab());
    }
    setViewMode("admin");
    window.scrollTo(0, 0);
  }

  async function handleAuthSession(session) {
    const email = normalizeAccessEmail(session?.user?.email || "");

    if (!email) return;

    if (!isAllowedAccessEmailDomain(email)) {
      await logoutAuth();
      setAdminContext(null);
      setAdminLoggedIn(false);
      setAdminLoginError(allowedAccessEmailMessage);
      setViewMode("adminLogin");
      return;
    }

    const { data: contextData, error: contextError } = await getMyAdminContext();
    const context = Array.isArray(contextData) ? contextData[0] : contextData;

    if (!contextError && context?.access_type === "platform") {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const parts = path.split("/").filter(Boolean);
      const isPanelRoute = parts.includes("painel");

      setAdminContext(context);
      setAdminEmail(email);
      setAdminLoggedIn(true);
      setAdminLoginError("");

      if (isPanelRoute) {
        if (!adminLoggedIn) {
          setAdminTab(readInitialAdminTab());
        }
        await loadCloudData();
        setViewMode("admin");
        window.scrollTo(0, 0);
      }

      return;
    }

    if (!contextError && context?.access_type === "barbershop" && context?.slug) {
      setAdminContext(context);

      if (context.slug !== currentSlugFromUrl()) {
        window.location.href = `${window.location.origin}/painel/${context.slug}`;
        return;
      }

      await loadCloudData();
      enterAdminWithEmail(email, { resetTab: !adminLoggedIn });
      return;
    }

    if (isAdminEmailAllowed(email)) {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isPanelRoute = path.split("/").filter(Boolean).includes("painel");

      if (viewMode !== "client" || isPanelRoute) {
        await loadCloudData();
        enterAdminWithEmail(email, { resetTab: !adminLoggedIn });
      }

      return;
    }

    if (adminLoggedIn || viewMode === "admin") {
      setAdminLoginError("");
      return;
    }

    setAdminLoggedIn(false);
    setAdminLoginError("Este e-mail nao esta cadastrado para acessar este painel.");
    setViewMode("adminLogin");
  }

  function markDataSaved() {
    setDataSavedAt(
      new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }

  function loadedCloudSlug() {
    return barbershopId && cloudSlug ? cloudSlug : "";
  }

  function goToClientView() {
    const slug = makeSlug(
      loadedCloudSlug() || routeSlug || business.slug || cloudSlug || currentSlugFromUrl()
    );

    setScreen("home");
    setBarberGateError("");
    setAdminLoginError("");
    setSelectedTime("");
    setPayment("");
    setAppointmentNote("");
    setConfirmedId("");
    setConfirmedToken("");
    setConfirmationSent(false);
    setWaitlistSent(false);
    setViewMode("client");

    if (typeof window !== "undefined") {
      window.history.pushState({}, "", slug ? `/agendamento/${slug}` : "/");
      window.scrollTo(0, 0);
    }
  }

  function missingLoadedBarbershopResult() {
    return {
      error: {
        message:
          "A barbearia real ainda não carregou da nuvem. Abra pelo link correto, como /painel/slug-da-barbearia, atualize a página e tente salvar novamente.",
      },
    };
  }

  function requireLoadedBarbershop() {
    const targetSlug = loadedCloudSlug();

    if (!targetSlug) {
      return {
        targetSlug: "",
        result: missingLoadedBarbershopResult(),
      };
    }

    return {
      targetSlug,
      result: null,
    };
  }

  useEffect(() => {
    saveData(storageKeys.business, business);
    markDataSaved();
  }, [business]);

  useEffect(() => {
    saveData(storageKeys.accessAccounts, accessAccounts);
    markDataSaved();
  }, [accessAccounts]);

  useEffect(() => {
    saveData(storageKeys.featureFlags, featureFlags);
    markDataSaved();
  }, [featureFlags]);

  useEffect(() => {
    saveData(storageKeys.services, services);
    markDataSaved();
  }, [services]);

  useEffect(() => {
    saveData(storageKeys.professionals, professionals);
    markDataSaved();
  }, [professionals]);

  useEffect(() => {
    saveData(storageKeys.schedule, schedule);
    markDataSaved();
  }, [schedule]);

  useEffect(() => {
    saveData(storageKeys.appointments, appointments);
    markDataSaved();
  }, [appointments]);

  useEffect(() => {
    saveData(storageKeys.waitlist, waitlist);
    markDataSaved();
  }, [waitlist]);

  useEffect(() => {
    loadCloudData();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const timer = window.setInterval(() => {
      setClockTick((current) => current + 1);
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token =
      new URLSearchParams(window.location.search).get("agendamento") ||
      new URLSearchParams(window.location.search).get("codigo");

    if (!token || !loadedCloudSlug()) return;

    setPublicAppointmentToken(token);
    setScreen("manage");
    loadPublicAppointment(token);
  }, [barbershopId, cloudSlug]);

  useEffect(() => {
    let active = true;

    getAuthSession().then(({ data }) => {
      if (active && data?.session) {
        handleAuthSession(data.session);
      }
    });

    const { data: authListener } = onAuthStateChange(async (_event, session) => {
      if (session) {
        handleAuthSession(session);
      }
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isPanelRoute = window.location.pathname
      .split("/")
      .filter(Boolean)
      .includes("painel");

    if (!adminLoggedIn || viewMode !== "admin" || !isPanelRoute || !loadedCloudSlug()) {
      return;
    }

    let refreshing = false;

    async function refreshPanelAppointments() {
      if (refreshing || document.hidden) return;
      refreshing = true;

      try {
        await refreshCloudAppointments();
      } catch (error) {
        console.error("Não foi possível atualizar a agenda automaticamente:", error);
      } finally {
        refreshing = false;
      }
    }

    const interval = window.setInterval(refreshPanelAppointments, 30000);
    const handleFocus = () => refreshPanelAppointments();
    const handleVisibility = () => {
      if (!document.hidden) refreshPanelAppointments();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [adminLoggedIn, viewMode, barbershopId, cloudSlug]);

  useEffect(() => {
    const targetSlug = loadedCloudSlug();

    if (cleanWhatsapp.length < 8 || !targetSlug) {
      setCloudHistory(null);
      return;
    }

    let active = true;

    async function loadClientHistory() {
      const { data, error } = await getClientHistory({
        target_slug: targetSlug,
        target_whatsapp: cleanWhatsapp,
      });

      if (!active) return;

      if (error || !data?.[0]) {
        setCloudHistory(null);
        return;
      }

      setCloudHistory({
        name: data[0].client_name,
        lastServiceText: data[0].last_service_text,
        visitCount: data[0].visit_count,
        lastProfessional: firstAvailableProfessionalName,
      });
    }

    loadClientHistory();

    return () => {
      active = false;
    };
  }, [cleanWhatsapp, barbershopId, cloudSlug]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", business.themeColor);
    root.style.setProperty("--primary-hover", business.themeColor);
    root.style.setProperty("--primary-soft", hexToRgba(business.themeColor, 0.14));
    root.style.setProperty("--success", business.themeColorSecondary);
    root.style.setProperty("--shadow-glow", `0 0 32px ${hexToRgba(business.themeColor, 0.22)}`);
  }, [business.themeColor, business.themeColorSecondary]);

  useEffect(() => {
    if (viewMode === "client") {
      applyClientBookingSeo(business, schedule);
      return;
    }

    applyGlobalSeo();
    if (typeof document !== "undefined") {
      document.title = `AgendaPro — Painel ${repairText(business.name)}`;
    }
  }, [business, schedule, viewMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let layer = document.getElementById("agendaProBackgroundLayer");

    if (!layer) {
      layer = document.createElement("div");
      layer.id = "agendaProBackgroundLayer";
      document.body.prepend(layer);
    }

    const isAdminView = viewMode === "admin" || viewMode === "adminLogin" || viewMode === "barberGate";
    const imageUrl = safeImageUrl(
      isAdminView ? business.adminBackgroundUrl : business.clientBackgroundUrl
    );
    const opacity = Number(
      isAdminView ? business.adminBackgroundOpacity : business.clientBackgroundOpacity
    );

    Object.assign(layer.style, {
      position: "fixed",
      inset: "0",
      zIndex: "0",
      pointerEvents: "none",
      backgroundSize: "cover",
      backgroundPosition: "center",
      opacity: imageUrl ? String(Math.max(0, Math.min(opacity || 0.16, 0.7))) : "0",
      backgroundImage: imageUrl
        ? `linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url("${imageUrl.replace(/"/g, "%22")}")`
        : "none",
    });
  }, [
    business.adminBackgroundOpacity,
    business.adminBackgroundUrl,
    business.clientBackgroundOpacity,
    business.clientBackgroundUrl,
    viewMode,
  ]);

  function isServiceDeleted(service) {
    return Boolean(service?.deletedAt || service?.deleted_at);
  }

  const activeServices = services
    .map((service, index) => ({ ...service, originalIndex: index }))
    .filter((service) => service.active && !isServiceDeleted(service));

  const activeRealClientProfessionals = professionals.filter(
    (item) => !item.fixed && item.active && item.name.trim() !== ""
  );
  const firstAvailableProfessional = professionals.find((item) => item.fixed);
  const showFirstAvailableProfessional =
    Boolean(firstAvailableProfessional?.active) && activeRealClientProfessionals.length !== 1;
  const clientProfessionals = [
    ...(showFirstAvailableProfessional && firstAvailableProfessional
      ? [{ ...firstAvailableProfessional, name: firstAvailableProfessionalName }]
      : []),
    ...activeRealClientProfessionals,
  ];
  const showProfessionalChoice =
    clientProfessionals.length > 1 || clientProfessionals.some((item) => !item.fixed);

  useEffect(() => {
    if (professional !== firstAvailableProfessionalName) return;
    if (showFirstAvailableProfessional) return;

    const nextProfessional = activeRealClientProfessionals[0]?.name;
    if (!nextProfessional) return;

    setProfessional(nextProfessional);
    setSelectedTime("");
  }, [
    activeRealClientProfessionals,
    professional,
    showFirstAvailableProfessional,
  ]);

  const chosenServices = useMemo(
    () =>
      services.filter(
        (service, index) => selectedServices.includes(index) && !isServiceDeleted(service)
      ),
    [services, selectedServices]
  );

  const promotionAvailable = featureIsAvailable("promotions");
  const activePromotions = promotionAvailable
    ? normalizePromotions(business.promotions, business).filter((promotion) => promotion.active)
    : [];
  const selectedPromotionDetails = activePromotions.filter((promotion) =>
    selectedPromotions.includes(promotion.id)
  );
  const selectedPromotionItems = selectedPromotionDetails.filter(
    (promotion) => promotion.type === "price"
  );
  const selectedDiscountPromotions = selectedPromotionDetails.filter(
    (promotion) => promotion.type !== "price"
  );
  const serviceDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
  const totalDuration =
    serviceDuration || (selectedPromotionDetails.length > 0 ? schedule.slotInterval : 0);
  const serviceTotal = chosenServices.reduce((sum, service) => sum + service.price, 0);
  const promotionItemsTotal = selectedPromotionItems.reduce(
    (sum, promotion) => sum + Number(promotion.promotionalPrice || 0),
    0
  );
  const totalPrice = roundCurrency(serviceTotal + promotionItemsTotal);
  const promotionDetails = activePromotions.map((promotion) => ({
    ...promotion,
    selected: selectedPromotions.includes(promotion.id),
    savings:
      promotion.type === "price"
        ? 0
        : roundCurrency(Math.min(totalPrice, promotionDiscountAmount(promotion, totalPrice))),
  }));
  const promotionValue = roundCurrency(
    Math.min(
      totalPrice,
      selectedDiscountPromotions.reduce(
        (sum, promotion) => sum + promotionDiscountAmount(promotion, totalPrice),
        0
      )
    )
  );
  const promotionalTotal = roundCurrency(Math.max(totalPrice - promotionValue, 0));
  const pixDiscount = pixAvailable ? clampPercentage(business.pixDiscount) : 0;
  const pixDiscountValue = roundCurrency(
    Math.min(promotionalTotal, (promotionalTotal * pixDiscount) / 100)
  );
  const pixPrice = roundCurrency(Math.max(promotionalTotal - pixDiscountValue, 0));
  const selectedPaymentTotal = payment === "pix" && pixAvailable ? pixPrice : promotionalTotal;
  const selectedPromotionText = selectedPromotionDetails.map((promotion) => promotion.title);
  const servicesText = chosenServices
    .map((service) => service.name)
    .concat(selectedPromotionText)
    .join(" + ");

  const dateCount = range === "today" ? 1 : range === "week" ? 7 : 60;
  const dateOptions = Array.from({ length: dateCount }, (_, index) => getDateAfterDays(index));

  const hasChosenService = selectedServices.length > 0 || selectedPromotions.length > 0;
  const slots = hasChosenService ? buildSlotsForDate(selectedDate) : [];
  const recommendedTime = slots.find((slot) => slot.available)?.time || "";
  const currentSlot = slots.find((slot) => slot.time === selectedTime);

  const canContinue =
    !scheduleBlocked &&
    cleanWhatsapp.length >= 8 &&
    clientName.trim() !== "" &&
    (selectedServices.length > 0 || selectedPromotions.length > 0) &&
    selectedTime !== "" &&
    currentSlot?.available;

  const todayAppointments = appointments
    .filter((item) => item.date === today)
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const todayRevenue = todayAppointments.reduce((sum, item) => sum + item.total, 0);

  const upcomingAppointments = appointments
    .filter((item) => item.date >= today)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5);

  const customerProfiles = useMemo<Client[]>(() => {
    const profiles: Record<string, Client> = {};

    appointments.forEach((appointment) => {
      const phone = String(appointment.whatsapp || "").replace(/\D/g, "");
      if (!phone) return;

      if (!profiles[phone]) {
        profiles[phone] = {
          whatsapp: phone,
          whatsappLink: normalizeBrazilWhatsapp(phone),
          name: appointment.clientName || "Cliente",
          visits: 0,
          revenue: 0,
          lastDate: appointment.date,
          lastTime: appointment.time,
          lastServices: appointment.services,
          pendingPayment: 0,
        };
      }

      profiles[phone].name = appointment.clientName || profiles[phone].name;
      profiles[phone].visits += 1;
      profiles[phone].revenue += Number(appointment.total || 0);

      if (!appointment.paid) {
        profiles[phone].pendingPayment += 1;
      }

      const currentLast = `${profiles[phone].lastDate} ${profiles[phone].lastTime || "00:00"}`;
      const appointmentDate = `${appointment.date} ${appointment.time || "00:00"}`;

      if (appointmentDate >= currentLast) {
        profiles[phone].lastDate = appointment.date;
        profiles[phone].lastTime = appointment.time;
        profiles[phone].lastServices = appointment.services;
      }
    });

    return Object.values(profiles).sort((a, b) => {
      if (b.visits !== a.visits) return b.visits - a.visits;
      return b.revenue - a.revenue;
    });
  }, [appointments]);

  const returningCustomers = customerProfiles.filter((customer) => customer.visits > 1);
  const topCustomer = customerProfiles[0];
  const loyaltyFeatureEnabled = featureIsAvailable("loyalty");

  const setupItems = [
    {
      label: "Identidade",
      description: "Nome, logo e cores",
      done: Boolean(business.name && (business.logo || business.logoImage)),
      tab: "appearance",
    },
    {
      label: "Endereço",
      description: "Local para o cliente",
      done: Boolean(business.address),
      tab: "appearance",
    },
    {
      label: "Serviços",
      description: "Preços e tempos",
      done: activeServices.length > 0,
      tab: "services",
    },
    {
      label: "Profissionais",
      description: "Equipe ativa",
      done: professionals.some((item) => item.active && !item.fixed),
      tab: "professionals",
    },
    {
      label: "Agenda",
      description: "Funcionamento real",
      done: Object.values(schedule.workingHours).some((item) => item.enabled),
      tab: "agenda",
    },
    {
      label: "Pagamentos",
      description: "PIX e promoções",
      done: !pixAvailable || Boolean(business.pixKey),
      tab: "payments",
    },
    {
      label: "Acessos",
      description: "Contas autorizadas",
      done: accessAccounts.some((account) => account.active),
      tab: "account",
    },
  ];

  const completedSetupItems = setupItems.filter((item) => item.done).length;
  const setupProgress = Math.round((completedSetupItems / setupItems.length) * 100);

  const featureStatusCards = platformFeatures.map((feature) => {
    const state = featureFlags[feature.key] || { enabled: false, released: false };
    const shortcut = featureShortcut(feature.key);
    const planAllowed = featurePlanAllowed(feature.key);
    const statusLabel = !planAllowed
      ? `Plano ${featureMinimumPlanLabel(feature.minPlan)}`
      : state.released
      ? state.enabled
        ? "Ativo"
        : "Liberado"
      : "Bloqueado";

    return {
      ...feature,
      planAllowed,
      state,
      shortcut,
      statusLabel,
    };
  });

  const activeFeatureCount = featureStatusCards.filter(
    (feature) => feature.planAllowed && feature.state.released && feature.state.enabled
  ).length;

  const nextTodaySlot = buildSlotsForDate(today).find((slot) => slot.available);
  const agendaStatus = isDayOff(today)
    ? "Fechado hoje"
    : nextTodaySlot
    ? `Livre às ${nextTodaySlot.time}`
    : "Sem horários livres";

  async function loadCloudData() {
    try {
      setCloudLoadState("loading");
      const slug = currentSlugFromUrl();

      if (!slug) {
        setBarbershopId("");
        setCloudSlug("");
        setCloudLoadState("missing-slug");
        setCloudStatus("Abra o app pelo link da barbearia para carregar os dados da nuvem.");
        return;
      }

      const includeAdminData =
        typeof window !== "undefined" &&
        window.location.pathname.split("/").filter(Boolean).includes("painel") &&
        (await hasAuthSession());

      const { businessResult, relatedResults } = await getBarbershopCloudBundle(slug, {
        includeAdminData,
      });
      const businessData = businessResult.data;
      const businessError = businessResult.error;

      if (businessError || !businessData) {
        setBarbershopId("");
        setCloudSlug(slug);
        setCloudLoadState("not-found");
        setCloudStatus("Barbearia não encontrada na nuvem.");
        return;
      }

      setBarbershopId(businessData.id);
      setCloudSlug(businessData.slug);
      setCloudLoadState("loaded");

      const [
        accountResult,
        servicesResult,
        professionalsResult,
        workingResult,
        breaksResult,
        daysOffResult,
        blocksResult,
        appointmentsResult,
        adminsResult,
        featureFlagsResult,
        waitlistResult,
      ] = relatedResults;

      const cloudProfessionals = (professionalsResult.data || []).map((item) => ({
        id: item.id,
        name: item.fixed ? firstAvailableProfessionalName : item.name,
        active: Boolean(item.active),
        fixed: Boolean(item.fixed),
        photoUrl: item.photo_url || "",
        commissionPercent: Number(item.commission_percent || 0),
        commissionByService: item.commission_by_service || {},
      }));

      setBusiness(mapBusinessFromCloud(businessData, accountResult.data));
      setAccessAccounts(
        mapAccessAccountsFromCloud(adminsResult.data || [], accountResult.data?.owner_email)
      );
      setFeatureFlags(mapFeatureFlagsFromCloud(featureFlagsResult.data || []));
      setWaitlist(mapWaitlistFromCloud(waitlistResult.data || []));

      if (servicesResult.data?.length) {
        setServices(mapServicesFromCloud(servicesResult.data));
      }

      if (cloudProfessionals.length) {
        setProfessionals(cloudProfessionals);
      }

      setSchedule(
        mapScheduleFromCloud(
          workingResult.data || [],
          breaksResult.data || [],
          daysOffResult.data || [],
          blocksResult.data || [],
          professionalsResult.data || [],
          businessData.slot_interval
        )
      );

      if (includeAdminData) {
        setAppointments(
          mapAppointmentsFromCloud(appointmentsResult.data || [], professionalsResult.data || [])
        );
      }

      setCloudStatus("Conectado à nuvem");
    } catch (error) {
      console.error(error);
      setCloudLoadState("error");
      setCloudStatus("Não foi possível conectar à nuvem.");
    }
  }

  function realProfessionals() {
    const activeProfessionals = professionals
      .filter((item) => !item.fixed && item.name.trim() !== "" && item.active)
      .map((item) => item.name);

    return activeProfessionals.length ? activeProfessionals : [fallbackProfessionalName];
  }

  function getWorkingDay(dateText) {
    const weekKey = weekMap[toDate(dateText).getDay()];
    return schedule.workingHours[weekKey];
  }

  function isDayOff(dateText) {
    return schedule.daysOff.some((item) => item.date === dateText);
  }

  function intervalOverlaps(startTime, duration, intervalStart, intervalEnd) {
    const start = timeToMinutes(startTime);
    const end = start + duration;
    return rangesOverlap(start, end, timeToMinutes(intervalStart), timeToMinutes(intervalEnd));
  }

  function appointmentBlocksSlot(item) {
    return !["cancelled", "canceled", "cancelado"].includes(String(item.status || "").toLowerCase());
  }

  function appointmentProfessionalMatches(item, professionalName) {
    const selectedProfessional = String(professionalName || "").trim();
    const appointmentProfessional = String(item.professional || "").trim();

    if (!selectedProfessional) return true;
    if (!appointmentProfessional) return true;
    if (appointmentProfessional === selectedProfessional) return true;

    const unknownProfessionalLabels = [
      firstAvailableProfessionalName,
      "Primeiro disponivel",
      "Profissional disponível",
      "Profissional disponivel",
    ];

    return unknownProfessionalLabels.includes(appointmentProfessional);
  }

  function appointmentConflict(
    dateText,
    startTime,
    duration,
    appointmentSource = appointments,
    professionalName = ""
  ) {
    return appointmentSource.some((item) => {
      if (item.date !== dateText) return false;
      if (!appointmentBlocksSlot(item)) return false;
      if (!appointmentProfessionalMatches(item, professionalName)) return false;

      const startA = timeToMinutes(startTime);
      const endA = startA + duration;
      const startB = timeToMinutes(item.time);
      const endB = startB + item.duration;

      return rangesOverlap(startA, endA, startB, endB);
    });
  }

  function blockConflict(professionalName, dateText, startTime, duration) {
    return schedule.blocks.find((block) => {
      if (block.date !== dateText) return false;
      if (block.professional !== "Todos" && block.professional !== professionalName) return false;
      return intervalOverlaps(startTime, duration, block.start, block.end);
    });
  }

  function baseReason(dateText, startTime, duration) {
    if (isDayOff(dateText)) return { status: "blocked", label: "Folga" };

    const breakItem = schedule.breaks.find((item) =>
      intervalOverlaps(startTime, duration, item.start, item.end)
    );

    if (breakItem) return { status: "break", label: breakItem.name };
    return null;
  }

  function professionalAvailable(
    professionalName,
    dateText,
    startTime,
    duration,
    appointmentSource = appointments
  ) {
    if (baseReason(dateText, startTime, duration)) return false;
    if (blockConflict(professionalName, dateText, startTime, duration)) return false;
    if (appointmentConflict(dateText, startTime, duration, appointmentSource, professionalName)) {
      return false;
    }
    return true;
  }

  function findAvailableProfessional(dateText, startTime, duration, appointmentSource = appointments) {
    return realProfessionals().find((item) =>
      professionalAvailable(item, dateText, startTime, duration, appointmentSource)
    );
  }

  function showNotice(message, title = "AgendaPro") {
    const rawMessage = repairText(String(message || ""));
    const cleanMessage =
      rawMessage.includes("Para evitar horário duplicado") && rawMessage.includes("Detalhe:")
        ? "Não foi possível confirmar este horário. Tente novamente em instantes."
        : rawMessage.includes("permission denied") || rawMessage.includes("get_admin_appointments")
        ? "Não foi possível concluir esta ação agora. Tente novamente."
        : rawMessage;

    setNotice({
      title,
      message: cleanMessage,
    });
  }

  function closeNotice() {
    setNotice(null);
  }

  function buildSlotsForDate(dateText, appointmentSource = appointments) {
    const workingDay = getWorkingDay(dateText);
    if (!workingDay.enabled || isDayOff(dateText)) return [];

    const interval = Math.max(Number(schedule.slotInterval) || 30, 10);
    const duration = totalDuration || interval;
    const start = timeToMinutes(workingDay.start);
    const end = timeToMinutes(workingDay.end);
    const nowMinutes = dateText === today ? currentTimeMinutes() : -1;
    const result = [];

    for (let current = start; current + duration <= end; current += interval) {
      const time = minutesToTime(current);

      if (dateText === today && current <= nowMinutes) {
        result.push({ time, status: "past", label: "Encerrado", available: false });
        continue;
      }

      const blockedBase = baseReason(dateText, time, duration);

      if (blockedBase) {
        result.push({ time, status: blockedBase.status, label: blockedBase.label, available: false });
        continue;
      }

      if (professional !== firstAvailableProfessionalName) {
        const manualBlock = blockConflict(professional, dateText, time, duration);

        if (manualBlock) {
          result.push({
            time,
            status: "blocked",
            label: manualBlock.reason || "Bloqueado",
            available: false,
          });
          continue;
        }

        if (appointmentConflict(dateText, time, duration, appointmentSource, professional)) {
          result.push({ time, status: "busy", label: "Ocupado", available: false });
          continue;
        }

        result.push({ time, status: "available", label: "Disponível", available: true, professional });
        continue;
      }

      const availableProfessional = findAvailableProfessional(
        dateText,
        time,
        duration,
        appointmentSource
      );

      result.push({
        time,
        status: availableProfessional ? "available" : "busy",
        label: availableProfessional || "Ocupado",
        available: Boolean(availableProfessional),
        professional: availableProfessional,
      });
    }

    const recommendedIndex = result.findIndex((slot) => slot.available);

    if (recommendedIndex >= 0) {
      result[recommendedIndex] = {
        ...result[recommendedIndex],
        status: "recommended",
        label: "Recomendado",
      };
    }

    return result;
  }

  function getDateAvailability(dateText) {
    const workingDay = getWorkingDay(dateText);

    if (isDayOff(dateText)) return { label: "Folga", available: false };
    if (!workingDay.enabled) return { label: "Fechado", available: false };
    if (buildSlotsForDate(dateText).some((slot) => slot.available)) {
      return { label: "Livre", available: true };
    }

    return { label: "Sem vagas", available: false };
  }

  function toggleService(index) {
    setSelectedServices((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : current.concat(index)
    );
    setSelectedTime("");
  }

  function togglePromotion(promotionId) {
    setSelectedPromotions((current) =>
      current.includes(promotionId)
        ? current.filter((item) => item !== promotionId)
        : current.concat(promotionId)
    );
    setSelectedTime("");
  }

  function repeatLastService() {
    if (!history) return;

    const repeatedServices =
      history.lastServices ||
      services
        .map((service, index) =>
          history.lastServiceText?.toLowerCase().includes(service.name.toLowerCase()) ? index : null
        )
        .filter((index) => index !== null);

    if (!repeatedServices.length) return;

    setClientName(history.name);
    setSelectedServices(repeatedServices);
    setProfessional(history.lastProfessional);
    setSelectedTime("");
  }

  function goCheckout() {
    if (scheduleBlocked) {
      showNotice("A agenda online está temporariamente indisponível.");
      return;
    }

    if (!canContinue) {
      showNotice("Informe o WhatsApp, o nome, escolha um serviço ou promoção e selecione um horário disponível.");
      return;
    }

    const freshCurrentSlot = buildSlotsForDate(selectedDate).find(
      (slot) => slot.time === selectedTime
    );

    if (!freshCurrentSlot?.available) {
      showNotice("Esse horário já passou ou ficou indisponível. Escolha outro horário.");
      setSelectedTime("");
      return;
    }

    setScreen("confirm");
    window.scrollTo(0, 0);
  }

  async function refreshCloudAppointments() {
    const targetSlug = loadedCloudSlug();
    if (!targetSlug) {
      throw new Error(missingLoadedBarbershopResult().error.message);
    }

    const shopId =
      barbershopId ||
      (await getBarbershopIdBySlug(targetSlug));

    const [appointmentsResult, professionalsResult] = await Promise.all([
      getAdminAppointments({
        target_slug: targetSlug,
      }),
      shopId
        ? getProfessionalsByBarbershop(shopId)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (appointmentsResult.error) {
      throw appointmentsResult.error;
    }

    if (professionalsResult.error) {
      throw professionalsResult.error;
    }

    const nextAppointments = mapAppointmentsFromCloud(
      appointmentsResult.data || [],
      professionalsResult.data || []
    );

    setAppointments(nextAppointments);
    setCloudStatus("Agenda atualizada pela nuvem");

    return nextAppointments;
  }

  async function finishSchedule() {
    if (!payment) {
      showNotice("Escolha a forma de pagamento.");
      return;
    }

    setCloudSaving("appointment");
    setCloudStatus("Verificando disponibilidade online...");

    try {
      const freshSlot = buildSlotsForDate(selectedDate, appointments).find(
        (slot) => slot.time === selectedTime
      );

      if (!freshSlot?.available) {
        showNotice("Esse horário acabou de ficar indisponível. Escolha outro horário.");
        setScreen("home");
        setSelectedTime("");
        setCloudStatus("Horário indisponível. Escolha outra opção.");
        return;
      }

      const finalProfessional =
        professional === firstAvailableProfessionalName ? freshSlot.professional : professional;

      const availabilityResult = await checkPublicSlotAvailability({
        target_slug: loadedCloudSlug(),
        target_date: selectedDate,
        target_time: selectedTime,
        target_professional: finalProfessional,
      });

      if (!availabilityResult.error && availabilityResult.data) {
        const availability = Array.isArray(availabilityResult.data)
          ? availabilityResult.data[0]
          : availabilityResult.data;

        if (availability?.available === false) {
          showNotice("Esse horário acabou de ser reservado. Escolha outro horário.");
          setScreen("home");
          setSelectedTime("");
          setCloudStatus("Horário indisponível. Escolha outra opção.");
          return;
        }
      }

      if (availabilityResult.error) {
        console.warn("Validação pública de horário indisponível:", availabilityResult.error);
        setCloudStatus("Validando disponibilidade na reserva protegida...");
      }

      const id = makeId("ag");
      const finalPayment = payment === "pix" && pixAvailable ? "pix" : "local";
      const finalTotal = selectedPaymentTotal;

      const appointmentData = {
        id,
        clientName,
        whatsapp,
        professional: finalProfessional,
        date: selectedDate,
        time: selectedTime,
        duration: totalDuration,
        services: servicesText,
        total: finalTotal,
        payment: finalPayment,
        paid: finalPayment === "pix",
        status: "confirmed",
        rescheduleRequested: false,
        note: appointmentNote.trim(),
      };

      const cloudBooking = await saveAppointmentToCloud(appointmentData, finalProfessional);

      if (!cloudBooking.id) {
        return;
      }

      const savedAppointment = {
        ...appointmentData,
        id: cloudBooking.id,
        publicToken: cloudBooking.token,
      };

      setAppointments((current) =>
        current.some((item) => item.id === savedAppointment.id)
          ? current
          : current.concat(savedAppointment)
      );
      setConfirmedId(cloudBooking.id);
      setConfirmedToken(cloudBooking.token);
      setProfessional(finalProfessional);
      const notificationSent = await sendBarberConfirmation(
        savedAppointment,
        cloudBooking.id,
        cloudBooking.token
      );
      setConfirmationSent(notificationSent);
      setScreen("success");
      window.scrollTo(0, 0);
    } catch (error) {
      const friendlyMessage = friendlyCloudErrorText(
        error,
        "Não foi possível confirmar este horário. Tente novamente em instantes."
      );
      console.error(error);
      setCloudStatus(friendlyMessage);
      showNotice(friendlyMessage);
    } finally {
      setCloudSaving("");
    }
  }

  function buildBarberConfirmationMessage(appointmentData, appointmentId) {
    const paymentLabel =
      appointmentData.payment === "pix" ? "PIX antecipado" : "Pagamento no local";
    const paymentStatus =
      appointmentData.payment === "pix"
        ? "PIX selecionado no app. Conferir comprovante."
        : "Pagamento pendente para o atendimento.";
    const managementLink = appointmentData.publicToken
      ? `${publicScheduleLink}?agendamento=${encodeURIComponent(appointmentData.publicToken)}`
      : "";

    return [
      "Novo agendamento confirmado",
      "",
      `Barbearia: ${business.name}`,
      `Cliente: ${appointmentData.clientName}`,
      `WhatsApp do cliente: ${appointmentData.whatsapp}`,
      "",
      `Serviço: ${appointmentData.services}`,
      `Data: ${formatDateForMessage(appointmentData.date)}`,
      `Horário: ${appointmentData.time}`,
      `Profissional: ${appointmentData.professional}`,
      `Tempo previsto: ${appointmentData.duration} min`,
      `Observação: ${appointmentData.note || "Sem observação"}`,
      "",
      `Total: ${money(appointmentData.total)}`,
      `Forma de pagamento: ${paymentLabel}`,
      `Status do pagamento: ${paymentStatus}`,
      appointmentId ? `Código do agendamento: ${appointmentId}` : "",
      managementLink ? `Link do cliente: ${managementLink}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function formatWhatsappIntegrationStatus(data) {
    const missing = Array.isArray(data?.missing) ? data.missing : [];
    const providerLabel = repairText(data?.providerLabel || "WhatsApp Cloud API");

    if (data?.ready) {
      return {
        checked: true,
        ready: true,
        provider: data.provider || "meta",
        providerLabel,
        message: "Pronto para disparo automático",
        missing,
      };
    }

    if (!data?.serviceRoleConfigured) {
      return {
        checked: true,
        ready: false,
        provider: data?.provider || "meta",
        providerLabel,
        message: "Integração automática pendente",
        missing,
      };
    }

    return {
      checked: true,
      ready: false,
      provider: data?.provider || "meta",
      providerLabel,
      message: missing.length
        ? "Integração automática pendente"
        : "WhatsApp automático ainda não configurado",
      missing,
    };
  }

  async function refreshWhatsappIntegrationStatus() {
    setWhatsappIntegrationStatus((current) => ({
      ...current,
      checked: false,
      message: "Verificando integração...",
    }));

    try {
      const data = await getWhatsappStatus();
      setWhatsappIntegrationStatus(formatWhatsappIntegrationStatus(data));
    } catch (error) {
      setWhatsappIntegrationStatus((current) => ({
        ...current,
        checked: true,
        ready: false,
        message: repairText(error?.message || "Não foi possível verificar a integração."),
      }));
    }
  }

  async function sendBarberConfirmation(appointmentData, appointmentId, publicToken = "") {
    const message = buildBarberConfirmationMessage(appointmentData, appointmentId);
    setBarberConfirmationMessage(message);

    if (!autoConfirmationFeatureEnabled || !business.automaticConfirmationEnabled) {
      setCloudStatus("Confirmação pronta para envio manual ao WhatsApp da barbearia.");
      return false;
    }

    try {
      const templateResult = await sendWhatsappAppointmentTemplates({
        barbershopSlug: loadedCloudSlug() || routeSlug,
        appointmentId,
        publicToken,
        target: "both",
      });

      const sent = templateResult?.sent || {};

      if (sent.customer || sent.shop) {
        setCloudStatus(
          sent.customer && sent.shop
            ? "WhatsApp automático enviado para cliente e barbearia."
            : sent.customer
            ? "WhatsApp automático enviado para o cliente."
            : "WhatsApp automático enviado para a barbearia."
        );
        return true;
      }

      throw new Error("Templates do WhatsApp não foram enviados.");
    } catch (templateError) {
      console.error("Falha ao enviar templates oficiais do WhatsApp:", templateError);
    }

    try {
      await sendWhatsappMessage({
        barbershopSlug: loadedCloudSlug() || routeSlug,
        to: business.whatsapp,
        message,
      });

      setCloudStatus("Confirmação enviada para o WhatsApp da barbearia.");
      return true;
    } catch (error) {
      console.error("Falha ao enviar WhatsApp automático:", error);
      setCloudStatus("Não foi possível enviar o WhatsApp automático.");
      return false;
    }
  }

  function normalizeBookingResponse(data) {
    if (!data) return { id: "", token: "" };

    if (typeof data === "string") {
      return { id: data, token: "" };
    }

    if (Array.isArray(data)) {
      return normalizeBookingResponse(data[0]);
    }

    return {
      id: String(data.id || data.appointment_id || data.appointmentId || ""),
      token: String(data.public_token || data.publicToken || data.token || ""),
    };
  }

  function shouldFallbackToLegacyBooking(error) {
    const text = cloudErrorText(error).toLowerCase();

    return (
      text.includes("book_appointment_v2") ||
      text.includes("function") ||
      text.includes("schema cache") ||
      text.includes("404") ||
      text.includes("pgrst202")
    );
  }

  async function saveAppointmentToCloud(appointmentData, finalProfessional) {
    const targetSlug = loadedCloudSlug();

    if (!targetSlug) {
      showNotice("Não foi possível identificar a barbearia para salvar online.");
      setCloudStatus("A barbearia não foi identificada para salvar online.");
      return { id: "", token: "" };
    }

    setCloudStatus("Reservando horário online...");

    const payload = {
      target_slug: targetSlug,
      client_name_input: appointmentData.clientName,
      whatsapp_input: appointmentData.whatsapp,
      professional_name_input: finalProfessional,
      service_text_input: appointmentData.services,
      appointment_date_input: appointmentData.date,
      appointment_time_input: appointmentData.time,
      duration_input: appointmentData.duration,
      total_input: appointmentData.total,
      payment_method_input: appointmentData.payment,
      paid_input: appointmentData.paid,
      note_input: appointmentData.note || "",
    };

    let { data, error } = await bookAppointmentV2(payload);

    if (error && shouldFallbackToLegacyBooking(error)) {
      const legacyPayload = { ...payload };
      delete legacyPayload.note_input;
      const legacyResult = await bookAppointmentLegacy(legacyPayload);
      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      const friendlyMessage = friendlyCloudErrorText(
        error,
        "Não foi possível confirmar este horário. Tente novamente em instantes."
      );
      console.error("Erro ao salvar online:", error);
      setCloudStatus(friendlyMessage);
      showNotice(friendlyMessage);
      return { id: "", token: "" };
    }

    if (!data) {
      setCloudStatus("A nuvem não retornou o código do agendamento.");
      showNotice("Não foi possível confirmar este horário. Tente novamente.");
      return { id: "", token: "" };
    }

    const booking = normalizeBookingResponse(data);

    if (!booking.id) {
      setCloudStatus("A nuvem não retornou o código do agendamento.");
      showNotice("Não foi possível confirmar este horário. Tente novamente.");
      return { id: "", token: "" };
    }

    setCloudStatus("Agendamento salvo na nuvem");
    return booking;
  }

  function mapPublicAppointment(row: unknown): PublicAppointmentState | null {
    if (!row) return null;
    const item = (Array.isArray(row) ? row[0] : row) as UnknownRecord | null | undefined;
    if (!item) return null;

    return {
      id: textFrom(item.id || item.public_token || item.publicToken, publicAppointmentToken),
      token: textFrom(item.public_token || item.publicToken, publicAppointmentToken),
      clientName: textFrom(item.client_name || item.clientName),
      whatsapp: textFrom(item.whatsapp),
      services: textFrom(item.service_text || item.services),
      professional: textFrom(item.professional_name || item.professional, "Profissional disponível"),
      date: textFrom(item.appointment_date || item.date),
      time: shortTime(textFrom(item.appointment_time || item.time)),
      duration: Number(item.duration || 0),
      total: Number(item.total || 0),
      payment: textFrom(item.payment_method || item.payment, "local"),
      paid: Boolean(item.paid),
      status: textFrom(item.status, "confirmed"),
      rescheduleRequested: Boolean(item.reschedule_requested || item.rescheduleRequested),
      note: textFrom(item.customer_note || item.note),
    };
  }

  async function loadPublicAppointment(token = publicAppointmentToken) {
    const targetSlug = loadedCloudSlug();
    const cleanToken = String(token || "").trim();

    if (!targetSlug || !cleanToken) return;

    setPublicActionSaving("load");

    try {
      const { data, error } = await getPublicAppointment({
        target_slug: targetSlug,
        public_token_input: cleanToken,
      });

      if (error) throw error;

      const nextAppointment = mapPublicAppointment(data);

      if (!nextAppointment) {
        setPublicAppointment(null);
        showNotice("Agendamento não encontrado para este link.");
        return;
      }

      setPublicAppointment(nextAppointment);
    } catch (error) {
      console.error(error);
      setPublicAppointment(null);
      showNotice(
        friendlyCloudErrorText(
          error,
          "Não foi possível carregar este agendamento. Confira o link ou fale com a barbearia."
        )
      );
    } finally {
      setPublicActionSaving("");
    }
  }

  async function updatePublicAppointment(action) {
    const targetSlug = loadedCloudSlug();
    const token = publicAppointment?.token || publicAppointmentToken;

    if (!targetSlug || !token) return;

    const isCancel = action === "cancel";
    setPublicActionSaving(action);

    try {
      const { error } = await (isCancel ? cancelPublicAppointment : requestPublicReschedule)({
        target_slug: targetSlug,
        public_token_input: token,
      });

      if (error) throw error;

      showNotice(isCancel ? "Agendamento cancelado." : "Pedido de remarcação enviado.");
      await loadPublicAppointment(token);
    } catch (error) {
      console.error(error);
      showNotice(
        friendlyCloudErrorText(
          error,
          "Não foi possível atualizar o agendamento online. Tente novamente."
        )
      );
    } finally {
      setPublicActionSaving("");
    }
  }

  async function runCloudSave(kind, successMessage, action) {
    setCloudSaving(kind);
    setCloudStatus("Salvando online...");

    try {
      const { error } = await action();

      if (error) {
        console.error(error);
        const friendlyMessage = friendlyCloudErrorText(
          error,
          "Não foi possível salvar online. Revise os dados e tente novamente."
        );
        setCloudStatus(friendlyMessage);
        showNotice(friendlyMessage);
        return false;
      }

      setCloudStatus(successMessage);
      showNotice(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      const friendlyMessage = friendlyCloudErrorText(
        error,
        "Não foi possível salvar online. Revise os dados e tente novamente."
      );
      setCloudStatus(friendlyMessage);
      showNotice(friendlyMessage);
      return false;
    } finally {
      setCloudSaving("");
    }
  }

  function saveBusinessToCloud() {
    return runCloudSave("business", "Dados da barbearia salvos online", async () => {
      const { targetSlug, result: missingBarbershop } = requireLoadedBarbershop();
      if (missingBarbershop) return missingBarbershop;

      const nextSlug = makeSlug(business.slug || business.name);
      const slugBelongsToLoadedShop = nextSlug && nextSlug === targetSlug;

      if (!slugBelongsToLoadedShop && isReservedBarbershopSlug(nextSlug)) {
        return {
          error: {
            message:
              "Este identificador é reservado para o AgendaPro. Use outro link, como master-barbearia.",
          },
        };
      }

      const result = await saveBusinessSettings({
        target_slug: targetSlug,
        name_input: business.name,
        slug_input: nextSlug,
        owner_email_input: business.ownerEmail || "",
        plan_input: business.plan || "professional",
        monthly_status_input: business.monthlyStatus || "active",
        next_billing_date_input: business.nextBillingDate || null,
        logo_text_input: business.logo || "B",
        logo_url_input: business.logoImage || null,
        whatsapp_input: normalizeBrazilWhatsapp(business.whatsapp),
        address_input: business.address || "",
        maps_url_input: normalizeMapsUrl(business.mapsUrl, business.address),
        theme_color_input: business.themeColor,
        theme_color_secondary_input: business.themeColorSecondary,
        client_background_url_input: business.clientBackgroundUrl || "",
        admin_background_url_input: business.adminBackgroundUrl || "",
        client_background_opacity_input: Number(business.clientBackgroundOpacity || 0.18),
        admin_background_opacity_input: Number(business.adminBackgroundOpacity || 0.12),
        pix_enabled_input: Boolean(business.pixEnabled),
        pix_key_input: business.pixKey || "",
        pix_discount_input: Number(business.pixDiscount || 0),
        automatic_confirmation_enabled_input: Boolean(business.automaticConfirmationEnabled),
        success_title_input: business.successTitle,
        success_message_input: business.successMessage,
        success_footer_input: business.successFooter,
      });

      if (!result.error) {
        const appearanceCenterResult = await saveAppearanceCenter({
          target_slug: nextSlug,
          theme_mode_input: business.themeMode === "light" ? "light" : "dark",
          welcome_message_input: business.welcomeMessage || "",
          rating_value_input: Number(business.ratingValue || 5),
          rating_text_input: business.ratingText || "",
        });
        const optionalAppearanceError = appearanceCenterResult.error
          ? cloudErrorText(appearanceCenterResult.error).toLowerCase()
          : "";
        const missingAppearanceRpc =
          optionalAppearanceError.includes("save_appearance_center") ||
          optionalAppearanceError.includes("could not find the function") ||
          optionalAppearanceError.includes("404");

        if (appearanceCenterResult.error && !missingAppearanceRpc) {
          return appearanceCenterResult;
        }

        setCloudSlug(nextSlug);
        if (typeof window !== "undefined" && nextSlug && nextSlug !== targetSlug) {
          const parts = window.location.pathname.split("/").filter(Boolean);
          const panelIndex = parts.indexOf("painel");
          const scheduleIndex = parts.indexOf("agendamento");
          if (panelIndex !== -1) window.history.replaceState(null, "", `/painel/${nextSlug}`);
          if (scheduleIndex !== -1) window.history.replaceState(null, "", `/agendamento/${nextSlug}`);
        }
      }

      if (result.error) return result;

      const promotions = normalizePromotions(business.promotions, business);
      const primaryPromotion = promotions[0] || initialBusiness.promotions[0];
      const multiPromotionResult = await savePromotions({
        target_slug: nextSlug,
        promotions_input: promotions,
      });

      if (!multiPromotionResult.error) return multiPromotionResult;

      return savePromotionSettings({
        target_slug: nextSlug,
        promotion_title_input: primaryPromotion.title || "",
        promotion_description_input: primaryPromotion.description || "",
        promotion_discount_input: Number(primaryPromotion.discountPercent || 0),
      });
    });
  }

  function saveAccessAccountsToCloud() {
    return runCloudSave("access", "Acessos do painel salvos online", async () => {
      const protectedAccounts = ensureRequiredPanelAccessAccounts(accessAccounts, business.ownerEmail);
      const activeAccounts = protectedAccounts.filter((account) => account.active !== false);
      const hasActiveOwner = countActiveOwnerAccessAccounts(protectedAccounts) > 0;
      const invalidAccount = activeAccounts.find((account) => !String(account.email || "").includes("@"));
      const invalidDomainAccount = activeAccounts.find(
        (account) => !isAllowedAccessEmailDomain(account.email)
      );
      const missingPassword = activeAccounts.find(
        (account) => !account.fixed && !isUuid(account.id) && !String(account.password || "").trim()
      );
      const weakPassword = activeAccounts.find(
        (account) =>
          String(account.password || "").trim() &&
          String(account.password || "").trim().length < 6
      );
      const mismatchedPassword = activeAccounts.find(
        (account) =>
          String(account.password || "").trim() &&
          String(account.password || "").trim() !== String(account.passwordConfirm || "").trim()
      );
      const targetSlug = barbershopId ? cloudSlug : "";

      if (invalidAccount) {
        return { error: { message: "Informe um e-mail válido em todos os acessos ativos." } };
      }

      if (invalidDomainAccount) {
        return { error: { message: allowedAccessEmailMessage } };
      }

      if (!hasActiveOwner) {
        return { error: { message: "A barbearia precisa manter pelo menos um Dono ativo." } };
      }

      if (missingPassword) {
        return {
          error: {
            message:
              "Informe a senha inicial do novo acesso antes de salvar. Essa senha cria o login da pessoa no painel.",
          },
        };
      }

      if (weakPassword) {
        return {
          error: {
            message: `A senha de ${weakPassword.email || "um acesso"} precisa ter pelo menos 6 caracteres.`,
          },
        };
      }

      if (mismatchedPassword) {
        return {
          error: {
            message: `A confirmação da senha de ${mismatchedPassword.email || "um acesso"} não confere.`,
          },
        };
      }

      if (!barbershopId || !targetSlug) {
        return {
          error: {
            message:
              "A barbearia real ainda não carregou da nuvem. Abra o painel pelo link correto da barbearia e atualize a página antes de salvar acessos.",
          },
        };
      }

      const authResult = await syncAccessAuthUsers(activeAccounts);

      if (authResult.error) return authResult;

      const result = await saveBarbershopAccesses({
        target_slug: targetSlug,
        accesses_input: protectedAccounts.map((account) => ({
          id: account.id || null,
          email: account.email.trim().toLowerCase(),
          role: cloudRoleFromLabel(account.role),
          active: Boolean(account.active),
        })),
      });

      if (!result.error) {
        setAccessAccounts((current) =>
          ensureRequiredPanelAccessAccounts(current, business.ownerEmail).map((account) => ({
            ...account,
            password: "",
            passwordConfirm: "",
          }))
        );
        setPasswordEditorOpen({});
        await loadCloudData();
        setAdminTab("account");
      }

      return result;
    });
  }

  async function syncAccessAuthUsers(accounts) {
    const accountsWithPassword = accounts.filter((account) => String(account.password || "").trim());

    if (!accountsWithPassword.length) return { error: null };

    for (const account of accountsWithPassword) {
      try {
        await syncAdminAuthUser({
          barbershopId,
          barbershopSlug: barbershopId ? cloudSlug : "",
          email: account.email.trim().toLowerCase(),
          password: String(account.password || "").trim(),
          role: cloudRoleFromLabel(account.role),
          active: Boolean(account.active),
        });
      } catch (error) {
        return {
          error: {
            message:
              error?.message ||
              `Não foi possível criar o login para ${account.email}. Confira a senha e tente novamente.`,
          },
        };
      }
    }

    return { error: null };
  }

  function saveFeatureFlagsToCloud() {
    return runCloudSave("features", "Melhorias salvas online", () =>
      saveFeatureFlags({
        target_slug: loadedCloudSlug(),
        features_input: platformFeatures.map((feature) => ({
          feature_key: feature.key,
          enabled: Boolean(featureFlags[feature.key]?.enabled),
          released: Boolean(featureFlags[feature.key]?.released),
        })),
      })
    );
  }

  function saveServicesToCloud() {
    return runCloudSave("services", "Serviços salvos online", () =>
      saveServicesRequest({
        target_slug: loadedCloudSlug(),
        services_input: services
          .filter((service) => !isServiceDeleted(service))
          .map((service, index) => ({
            id: service.id || null,
            name: service.name,
            duration: Number(service.duration || 30),
            price: Number(service.price || 0),
            active: Boolean(service.active),
            sort_order: index + 1,
          })),
      })
    );
  }

  function saveProfessionalsToCloud() {
    return runCloudSave("professionals", "Profissionais salvos online", () =>
      saveProfessionals({
        target_slug: loadedCloudSlug(),
        professionals_input: professionals.map((item) => ({
          id: item.id || null,
          name: item.fixed ? firstAvailableProfessionalName : item.name,
          active: Boolean(item.active),
          fixed: Boolean(item.fixed),
          photo_url: item.photoUrl || "",
          commission_percent: Number(item.commissionPercent || 0),
          commission_by_service: item.commissionByService || {},
        })),
      })
    );
  }

  function saveScheduleToCloud() {
    return runCloudSave("schedule", "Agenda salva online", () =>
      saveScheduleSettings({
        target_slug: loadedCloudSlug(),
        slot_interval_input: Number(schedule.slotInterval || 30),
        working_hours_input: weekDays.map((day) => ({
          week_day: weekMap.indexOf(day.key),
          enabled: Boolean(schedule.workingHours[day.key].enabled),
          start_time: schedule.workingHours[day.key].start,
          end_time: schedule.workingHours[day.key].end,
        })),
        breaks_input: schedule.breaks.map((item) => ({
          name: item.name,
          start_time: item.start,
          end_time: item.end,
        })),
        days_off_input: schedule.daysOff.map((item) => ({
          date: item.date,
          reason: item.reason,
        })),
        blocks_input: schedule.blocks.map((item) => ({
          professional_name: item.professional,
          date: item.date,
          start_time: item.start,
          end_time: item.end,
          reason: item.reason,
        })),
      })
    );
  }

  async function syncAppointmentAction(id, patch) {
    if (!isUuid(id)) return;

    try {
      const appointmentActionPayload = {
        target_slug: loadedCloudSlug(),
        appointment_id_input: id,
        paid_input: patch.paid ?? null,
        status_input: patch.status ?? null,
        reschedule_requested_input: patch.rescheduleRequested ?? null,
      };

      if (Object.prototype.hasOwnProperty.call(patch, "note")) {
        appointmentActionPayload.note_input = patch.note ?? "";
        appointmentActionPayload.payment_method_input = null;
      }

      if (Object.prototype.hasOwnProperty.call(patch, "payment")) {
        appointmentActionPayload.payment_method_input = patch.payment ?? null;
        appointmentActionPayload.note_input = null;
      }

      const { error } = await updateAppointmentAction(appointmentActionPayload);

      if (error) throw error;

      setCloudStatus("Agendamento atualizado online");
    } catch (error) {
      console.error(error);
      setCloudStatus(
        friendlyCloudErrorText(error, "Não foi possível sincronizar esta alteração agora.")
      );
    }
  }

  async function joinWaitlist() {
    if (!waitlistAvailable) {
      showNotice("Lista de espera ainda não está disponível para esta barbearia.");
      return;
    }

    if (cleanWhatsapp.length < 8 || clientName.trim() === "" || !hasChosenService) {
      showNotice("Informe o WhatsApp, o nome e escolha um serviço ou promoção para entrar na lista de espera.");
      return;
    }

    const waitlistData = {
      id: makeId("wait"),
      clientName,
      whatsapp,
      date: selectedDate,
      services: servicesText,
      status: "waiting",
      createdAt: new Date().toISOString(),
    };

    setWaitlist((current) => [waitlistData].concat(current));
    setWaitlistSent(true);
    setCloudStatus("Pedido adicionado à lista de espera localmente.");
    setCloudSaving("waitlist");

    try {
      const { data, error } = await joinWaitlistRequest({
        target_slug: loadedCloudSlug(),
        client_name_input: clientName,
        whatsapp_input: whatsapp,
        preferred_date_input: selectedDate,
        service_text_input: servicesText,
      });

      if (error) throw error;

      if (data) {
        setWaitlist((current) =>
          current.map((item) =>
            item.id === waitlistData.id ? { ...item, id: String(data) } : item
          )
        );
      }

      setCloudStatus("Cliente adicionado à lista de espera online.");
    } catch (error) {
      console.error(error);
      setCloudStatus(
        friendlyCloudErrorText(error, "Não foi possível sincronizar a lista de espera agora.")
      );
    } finally {
      setCloudSaving("");
    }
  }

  async function updateWaitlistStatus(id, status) {
    setWaitlist((current) =>
      status === "removed"
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, status } : item))
    );

    if (!isUuid(id)) return;

    setCloudSaving("waitlist-status");

    try {
      const { error } = await updateWaitlistStatusRequest({
        target_slug: loadedCloudSlug(),
        waitlist_id_input: id,
        status_input: status,
      });

      if (error) throw error;

      setCloudStatus("Lista de espera atualizada online.");
    } catch (error) {
      console.error(error);
      setCloudStatus(
        friendlyCloudErrorText(error, "Não foi possível sincronizar a lista de espera agora.")
      );
    } finally {
      setCloudSaving("");
    }
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    showNotice("Copiado: " + text);
  }

  function assetExtension(file) {
    const byType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const extension = String(file?.name || "").split(".").pop()?.toLowerCase();

    return byType[file?.type] || (extension && extension.length <= 5 ? extension : "jpg");
  }

  async function uploadBusinessAsset(file, folder) {
    if (!file) throw new Error("Selecione uma imagem para enviar.");

    if (!String(file.type || "").startsWith("image/")) {
      throw new Error("Envie apenas arquivos de imagem.");
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("A imagem precisa ter até 5 MB.");
    }

    const targetSlug = makeSlug(loadedCloudSlug() || routeSlug || business.slug || cloudSlug);

    if (!targetSlug) {
      throw new Error("Não foi possível identificar a barbearia para enviar a imagem.");
    }

    const fileName = `${Date.now()}-${Math.round(Math.random() * 100000)}.${assetExtension(file)}`;
    const filePath = `${targetSlug}/${folder}/${fileName}`;
    const { error } = await uploadAsset(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
      upsert: true,
    });

    if (error) {
      throw new Error(
        "Não foi possível enviar a imagem agora. Tente novamente ou fale com o suporte da plataforma."
      );
    }

    const { data } = getPublicAssetUrl(filePath);

    if (!data?.publicUrl) {
      throw new Error("A imagem subiu, mas não foi possível gerar o link público.");
    }

    return data.publicUrl;
  }

  async function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setCloudSaving("asset-logo");

    try {
      const publicUrl = await uploadBusinessAsset(file, "logos");
      setBusiness((current) => ({ ...current, logoImage: publicUrl }));
      setCloudStatus("Logo enviada para a nuvem. Salve a aparência para fixar no cadastro.");
      showNotice("Logo enviada. Agora clique em Salvar aparência.");
    } catch (error) {
      const message = repairText(error?.message || "Não foi possível enviar a logo.");
      setCloudStatus(message);
      showNotice(message);
    } finally {
      event.target.value = "";
      setCloudSaving("");
    }
  }

  async function handleBackgroundUpload(field, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const folder = field === "adminBackgroundUrl" ? "admin-backgrounds" : "client-backgrounds";

    setCloudSaving(field === "adminBackgroundUrl" ? "asset-admin-background" : "asset-client-background");

    try {
      const publicUrl = await uploadBusinessAsset(file, folder);
      setBusiness((current) => ({ ...current, [field]: publicUrl }));
      setCloudStatus("Plano de fundo enviado para a nuvem. Salve os fundos para fixar no cadastro.");
      showNotice("Imagem enviada. Agora clique em Salvar planos de fundo.");
    } catch (error) {
      const message = repairText(error?.message || "Não foi possível enviar o plano de fundo.");
      setCloudStatus(message);
      showNotice(message);
    } finally {
      event.target.value = "";
      setCloudSaving("");
    }
  }

  async function handlePortfolioImageUpload(field, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const folderMap = {
      beforeImageUrl: "portfolio-before",
      processImageUrl: "portfolio-process",
      finalImageUrl: "portfolio-final",
    };
    const folder = folderMap[field] || "portfolio";

    setCloudSaving(`asset-${folder}`);

    try {
      const publicUrl = await uploadBusinessAsset(file, folder);
      setBusiness((current) => ({ ...current, [field]: publicUrl }));
      setCloudStatus("Foto enviada para a nuvem. Salve as fotos para aparecerem no cliente.");
      showNotice("Foto enviada. Agora clique em Salvar fotos do carrossel.");
    } catch (error) {
      const message = repairText(error?.message || "Não foi possível enviar a foto.");
      setCloudStatus(message);
      showNotice(message);
    } finally {
      event.target.value = "";
      setCloudSaving("");
    }
  }

  async function handleProfessionalPhotoUpload(index, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setCloudSaving(`asset-professional-${index}`);

    try {
      const publicUrl = await uploadBusinessAsset(file, "professionals");
      updateProfessional(index, "photoUrl", publicUrl);
      setCloudStatus("Foto do profissional enviada. Salve os profissionais para sincronizar online.");
      showNotice("Foto enviada. Agora clique em Salvar profissionais.");
    } catch (error) {
      const message = repairText(error?.message || "Não foi possível enviar a foto do profissional.");
      setCloudStatus(message);
      showNotice(message);
    } finally {
      event.target.value = "";
      setCloudSaving("");
    }
  }

  function saveAppearanceMediaToCloud() {
    return runCloudSave("appearance-media", "Fotos da tela do cliente salvas online", async () => {
      const targetSlug = loadedCloudSlug();

      if (!targetSlug) {
        return missingLoadedBarbershopResult();
      }

      return savePremiumAppearance({
        target_slug: targetSlug,
        logo_url_input: business.logoImage || "",
        theme_color_input: business.themeColor || "",
        client_background_url_input: business.clientBackgroundUrl || "",
        admin_background_url_input: business.adminBackgroundUrl || "",
        client_background_opacity_input: Number(business.clientBackgroundOpacity || 0.18),
        admin_background_opacity_input: Number(business.adminBackgroundOpacity || 0.12),
        before_image_url_input: business.beforeImageUrl || "",
        process_image_url_input: business.processImageUrl || "",
        final_image_url_input: business.finalImageUrl || "",
        before_image_label_input: business.beforeImageLabel || "Antes",
        process_image_label_input: business.processImageLabel || "Processo",
        final_image_label_input: business.finalImageLabel || "Finalizado",
      });
    });
  }

  function saveBackgroundsToCloud() {
    return runCloudSave("backgrounds", "Planos de fundo salvos online", async () => {
      const targetSlug = loadedCloudSlug();

      if (!targetSlug) {
        return missingLoadedBarbershopResult();
      }

      return saveBackgroundSettings({
        target_slug: targetSlug,
        client_background_url_input: business.clientBackgroundUrl || "",
        admin_background_url_input: business.adminBackgroundUrl || "",
        client_background_opacity_input: Number(business.clientBackgroundOpacity || 0.18),
        admin_background_opacity_input: Number(business.adminBackgroundOpacity || 0.12),
      });
    });
  }

  function updateBusinessName(value) {
    const oldAutoSlug = makeSlug(business.name);
    const shouldUpdateSlug = !business.slug || business.slug === oldAutoSlug;

    setBusiness({
      ...business,
      name: value,
      slug: shouldUpdateSlug ? makeSlug(value) : business.slug,
    });
  }

  function updateBusinessSlug(value) {
    setBusiness({ ...business, slug: makeSlug(value) });
  }

  function addAccessAccount() {
    setAccessAccounts((current) =>
      current.concat({
        id: makeId("access"),
        email: "",
        role: "Funcionário",
        active: true,
        fixed: false,
        password: "",
        passwordConfirm: "",
      })
    );
  }

  function accessEditorKey(account, index) {
    return String(account.id || `access-${index}`);
  }

  function setAccessPasswordEditor(index, account, open) {
    const key = accessEditorKey(account, index);

    setPasswordEditorOpen((current) => ({ ...current, [key]: open }));

    if (!open) {
      setAccessAccounts((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, password: "", passwordConfirm: "" } : item
        )
      );
    }
  }

  function updateAccessAccount(index, field, value) {
    setAccessAccounts((current) =>
      current.map((account, itemIndex) => {
        if (itemIndex !== index) return account;

        const nextAccount = {
          ...account,
          [field]:
            field === "active"
              ? Boolean(value)
              : field === "email"
              ? String(value).trim().toLowerCase()
              : value,
        };

        if (
          isActiveOwnerAccessAccount(account) &&
          !isActiveOwnerAccessAccount(nextAccount) &&
          countActiveOwnerAccessAccounts(current) <= 1
        ) {
          showNotice("A barbearia precisa manter pelo menos um Dono ativo.");
          return account;
        }

        return nextAccount;
      })
    );
  }

  function removeAccessAccount(index) {
    const account = accessAccounts[index];

    if (!account || account.fixed) return;

    if (isActiveOwnerAccessAccount(account) && countActiveOwnerAccessAccounts(accessAccounts) <= 1) {
      showNotice("A barbearia precisa manter pelo menos um Dono ativo.");
      return;
    }

    setAccessAccounts((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateFeatureFlag(featureKey, field, value) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);

    if (!normalizedFeatureKey) return;

    setFeatureFlags((current) => ({
      ...current,
      [normalizedFeatureKey]: {
        enabled: Boolean(current[normalizedFeatureKey]?.enabled),
        released: Boolean(current[normalizedFeatureKey]?.released),
        [field]: Boolean(value),
      },
    }));
  }

  function isFutureOnlyFeature(featureKey) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);

    return (
      normalizedFeatureKey === "google_login" ||
      normalizedFeatureKey === "instagram_booking"
    );
  }

  function setFeatureRelease(featureKey, released) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);

    if (!normalizedFeatureKey) return;

    setFeatureFlags((current) => ({
      ...current,
      [normalizedFeatureKey]: {
        enabled: released ? !isFutureOnlyFeature(normalizedFeatureKey) : false,
        released,
      },
    }));
  }

  function featureShortcut(featureKey) {
    const normalizedFeatureKey = normalizeFeatureKey(featureKey);

    if (normalizedFeatureKey === "pix") {
      return { label: "Configurar pagamentos", tab: "payments", disabled: false };
    }

    if (normalizedFeatureKey === "auto_confirmation") {
      return { label: "Editar mensagem final", tab: "appearance", disabled: false };
    }

    if (normalizedFeatureKey === "service_delete") {
      return { label: "Gerenciar serviços", tab: "services", disabled: false };
    }

    if (normalizedFeatureKey === "backplate") {
      return { label: "Configurar fundos", tab: "appearance", disabled: false };
    }

    if (normalizedFeatureKey === "appearance_media") {
      return { label: "Configurar fotos", tab: "appearance", disabled: false };
    }

    if (normalizedFeatureKey === "promotions") {
      return { label: "Configurar promoção", tab: "payments", disabled: false };
    }

    if (normalizedFeatureKey === "visual_agenda") {
      return { label: "Abrir agenda visual", tab: "agendaPremium", disabled: false };
    }

    if (normalizedFeatureKey === "commissions") {
      return { label: "Configurar comissões", tab: "professionals", disabled: false };
    }

    if (normalizedFeatureKey === "waitlist") {
      return { label: "Ver lista de espera", tab: "agendaPremium", disabled: false };
    }

    if (normalizedFeatureKey === "loyalty") {
      return { label: "Ver clientes", tab: "customers", disabled: false };
    }

    if (normalizedFeatureKey === "google_login") {
      return { label: "Login em preparação", tab: "", disabled: true };
    }

    if (normalizedFeatureKey === "instagram_booking") {
      return { label: "Instagram em preparação", tab: "", disabled: true };
    }

    if (normalizedFeatureKey === "unique_link") {
      return { label: "Link ativo no cliente", tab: "", disabled: true };
    }

    return { label: "Em breve", tab: "", disabled: true };
  }

  function startNewSchedule() {
    setScreen("home");
    setSelectedServices([]);
    setSelectedTime("");
    setPayment("");
    setAppointmentNote("");
    setConfirmedId("");
    setConfirmedToken("");
    setPublicAppointment(null);
    setPublicAppointmentToken("");
    setConfirmationSent(false);
    setBarberConfirmationMessage("");
    setWaitlistSent(false);
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", publicScheduleLink);
    }
    window.scrollTo(0, 0);
  }

  function updateService(index, field, value) {
    setServices((current) =>
      current.map((service, itemIndex) => {
        if (itemIndex !== index) return service;
        if (field === "active") return { ...service, active: Boolean(value) };
        if (field === "duration" || field === "price") return { ...service, [field]: Number(value) };
        return { ...service, [field]: value };
      })
    );
    setSelectedTime("");
  }

  function addService() {
    setServices((current) =>
      current.concat({ name: "Novo serviço", duration: 30, price: 50, active: true })
    );
  }

  async function removeService(index) {
    const service = services[index];

    if (!service) return;

    const ok = window.confirm(
      `Excluir o serviço "${service.name}"? Os agendamentos antigos continuarão salvos.`
    );

    if (!ok) return;

    const deletedAt = new Date().toISOString();

    setServices((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, active: false, deletedAt } : item
      )
    );
    setSelectedServices((current) => current.filter((itemIndex) => itemIndex !== index));
    setSelectedTime("");

    if (!service.id) return;

    setCloudSaving("services");

    try {
      const { error } = await softDeleteService({
        target_slug: loadedCloudSlug(),
        service_id_input: service.id,
      });

      if (error) throw error;

      setCloudStatus("Serviço excluído online com segurança.");
      showNotice("Serviço excluído com segurança.");
    } catch (error) {
      console.error(error);
      const friendlyMessage = friendlyCloudErrorText(
        error,
        "Não foi possível sincronizar a exclusão do serviço agora. Tente salvar serviços novamente."
      );
      setCloudStatus(friendlyMessage);
      showNotice(friendlyMessage);
    } finally {
      setCloudSaving("");
    }
  }

  function updateProfessional(index, field, value) {
    const currentProfessional = professionals[index];

    setProfessionals((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: field === "active" ? Boolean(value) : value } : item
      )
    );

    if (field === "active" && value === false && currentProfessional?.name === professional) {
      const nextActiveProfessional = professionals.find(
        (item, itemIndex) =>
          itemIndex !== index && !item.fixed && item.active && item.name.trim() !== ""
      )?.name;

      setProfessional(nextActiveProfessional || firstAvailableProfessionalName);
    }

    if (field === "name" && currentProfessional?.name === professional) {
      setProfessional(value);
    }

    setSelectedTime("");
  }

  function addProfessional() {
    setProfessionals((current) =>
      current.concat({ name: "Novo profissional", active: true, fixed: false, photoUrl: "" })
    );
  }

  function removeProfessional(index) {
    const professionalToRemove = professionals[index];

    if (!professionalToRemove || professionalToRemove.fixed) return;

    setProfessionals((current) => current.filter((_, itemIndex) => itemIndex !== index));

    if (professional === professionalToRemove.name) {
      setProfessional(firstAvailableProfessionalName);
    }

    setSelectedTime("");
  }

  function updateWorkingDay(dayKey, field, value) {
    setSchedule((current) => ({
      ...current,
      workingHours: {
        ...current.workingHours,
        [dayKey]: {
          ...current.workingHours[dayKey],
          [field]: field === "enabled" ? Boolean(value) : value,
        },
      },
    }));
    setSelectedTime("");
  }

  function addBreak() {
    setSchedule((current) => ({
      ...current,
      breaks: current.breaks.concat({
        id: makeId("break"),
        name: "Pausa",
        start: "15:00",
        end: "15:30",
      }),
    }));
  }

  function updateBreak(index, field, value) {
    setSchedule((current) => ({
      ...current,
      breaks: current.breaks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setSelectedTime("");
  }

  function removeBreak(index) {
    setSchedule((current) => ({
      ...current,
      breaks: current.breaks.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedTime("");
  }

  function addDayOff() {
    setSchedule((current) => ({
      ...current,
      daysOff: current.daysOff.concat({ id: makeId("off"), date: today, reason: "Folga" }),
    }));
    setSelectedTime("");
  }

  function updateDayOff(index, field, value) {
    setSchedule((current) => ({
      ...current,
      daysOff: current.daysOff.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setSelectedTime("");
  }

  function removeDayOff(index) {
    setSchedule((current) => ({
      ...current,
      daysOff: current.daysOff.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedTime("");
  }

  function addBlock() {
    setSchedule((current) => ({
      ...current,
      blocks: current.blocks.concat({
        id: makeId("block"),
        date: today,
        start: "14:00",
        end: "15:00",
        professional: "Todos",
        reason: "Bloqueio manual",
      }),
    }));
    setSelectedTime("");
  }

  function updateBlock(index, field, value) {
    setSchedule((current) => ({
      ...current,
      blocks: current.blocks.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
    setSelectedTime("");
  }

  function removeBlock(index) {
    setSchedule((current) => ({
      ...current,
      blocks: current.blocks.filter((_, itemIndex) => itemIndex !== index),
    }));
    setSelectedTime("");
  }

  function cancelAppointment(id) {
    syncAppointmentAction(id, { status: "cancelled" });
    setAppointments((current) => current.filter((appointment) => appointment.id !== id));
  }

  function confirmAppointment(id) {
    syncAppointmentAction(id, { status: "confirmed" });
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status: "confirmed" } : appointment
      )
    );
  }

  function completeAppointment(id) {
    syncAppointmentAction(id, { status: "completed" });
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status: "completed" } : appointment
      )
    );
  }

  function confirmAppointmentPayment(id, paymentMode = "cash") {
    syncAppointmentAction(id, { paid: true, payment: paymentMode });
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, paid: true, payment: paymentMode } : appointment
      )
    );
  }

  function rescheduleAppointment(id) {
    const currentAppointment = appointments.find((appointment) => appointment.id === id);
    syncAppointmentAction(id, {
      rescheduleRequested: !currentAppointment?.rescheduleRequested,
    });
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? { ...appointment, rescheduleRequested: !appointment.rescheduleRequested }
          : appointment
      )
    );
  }

  function updateAppointmentNote(id, note) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, note } : appointment
      )
    );
  }

  function saveAppointmentNote(id) {
    const currentNote = appointments.find((appointment) => appointment.id === id)?.note || "";
    syncAppointmentAction(id, { note: currentNote });
  }

  function openAdminArea() {
    setScreen("home");
    setBarberGateError("");
    setViewMode(adminLoggedIn ? "admin" : "barberGate");
    window.scrollTo(0, 0);
  }

  function normalizeAccessText(value) {
    return makeSlug(String(value || ""));
  }

  function phoneMatchesBusiness(typedPhone) {
    const typed = normalizeBrazilWhatsapp(typedPhone);
    const registered = normalizeBrazilWhatsapp(business.whatsapp);

    if (typed.length < 8 || registered.length < 8) return false;

    return (
      typed === registered ||
      `55${typed}` === registered ||
      typed.slice(-11) === registered.slice(-11)
    );
  }

  function nameMatchesBusiness(typedName) {
    const typed = normalizeAccessText(typedName);
    const businessName = normalizeAccessText(business.name);
    const businessSlug = normalizeAccessText(business.slug);

    return typed.length >= 3 && (typed === businessName || typed === businessSlug);
  }

  function verifyBarberIdentity() {
    if (!phoneMatchesBusiness(barberGateWhatsapp) || !nameMatchesBusiness(barberGateName)) {
      setBarberGateError("O WhatsApp ou o nome da barbearia não conferem com o cadastro.");
      return;
    }

    setBarberGateError("");
    setAdminLoginError("");
    setViewMode("adminLogin");
    window.scrollTo(0, 0);
  }

  async function loginWithGoogle() {
    const typedEmail = normalizeAccessEmail(adminEmail);

    if (typedEmail && !isAllowedAccessEmailDomain(typedEmail)) {
      setAdminLoginError(allowedAccessEmailMessage);
      return;
    }

    setAdminLoginError("");

    try {
      const redirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}${window.location.pathname}`
          : adminPanelLink;
      const { error } = await loginWithGoogleRedirect(redirectTo);

      if (error) {
        setAdminLoginError("O login com Google ainda não está configurado na autenticação.");
      }
    } catch {
      setAdminLoginError("O login com Google ainda não está configurado na autenticação.");
    }
  }

  async function loginAdmin() {
    const normalizedEmail = normalizeAccessEmail(adminEmail);

    if (!normalizedEmail || !adminPassword) {
      setAdminLoginError("Informe o e-mail e a senha cadastrados.");
      return;
    }

    if (!isAllowedAccessEmailDomain(normalizedEmail)) {
      setAdminLoginError(allowedAccessEmailMessage);
      return;
    }

    setAdminLoginError("");

    try {
      const { data, error } = await loginWithEmailPassword(normalizedEmail, adminPassword);

      if (error) throw error;

      setAdminPassword("");
      await handleAuthSession(data?.session);
    } catch {
      setAdminLoginError("E-mail ou senha inválidos para este painel.");
    }
  }

  function logoutAdmin() {
    logoutAuth();
    setAdminLoggedIn(false);
    setAdminPassword("");
    setPasswordForm({ next: "", confirm: "" });
    setPasswordMessage("");
    goToClientView();
  }

  async function updateOwnPassword() {
    const nextPassword = passwordForm.next.trim();

    if (nextPassword.length < 6) {
      setPasswordMessage("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (nextPassword !== passwordForm.confirm.trim()) {
      setPasswordMessage("A confirmação da senha não confere.");
      return;
    }

    setPasswordSaving("password");
    setPasswordMessage("");

    try {
      const { error } = await updateCurrentPassword(nextPassword);

      if (error) throw error;

      setPasswordForm({ next: "", confirm: "" });
      setPasswordMessage("Senha atualizada com sucesso.");
    } catch {
      setPasswordMessage("Não foi possível alterar a senha. Entre novamente e tente de novo.");
    } finally {
      setPasswordSaving("");
    }
  }

  function resetDemoData() {
    const canReset = window.confirm(
      "Restaurar dados de demonstração? Isso apaga as alterações salvas neste navegador."
    );

    if (!canReset) return;

    removeSavedData();
    setBusiness(initialBusiness);
    setAccessAccounts(initialAccessAccounts);
    setFeatureFlags(initialFeatureFlags());
    setServices(initialServices);
    setProfessionals(initialProfessionals);
    setSchedule(initialSchedule);
    setAppointments(initialAppointments);
    setWaitlist(initialWaitlist);
    setSelectedServices([]);
    setSelectedTime("");
    setPayment("");
    setWaitlistSent(false);
    setAdminTab("dashboard");
    setScreen("home");
    markDataSaved();
  }

  function closeToday() {
    if (schedule.daysOff.some((item) => item.date === today)) {
      showNotice("Hoje já está fechado.");
      return;
    }

    setSchedule((current) => ({
      ...current,
      daysOff: current.daysOff.concat({
        id: makeId("off"),
        date: today,
        reason: "Fechado pelo painel",
      }),
    }));
    setAdminTab("agenda");
  }

  function openToday() {
    const weekKey = weekMap[toDate(today).getDay()];

    setSchedule((current) => ({
      ...current,
      daysOff: current.daysOff.filter((item) => item.date !== today),
      workingHours: {
        ...current.workingHours,
        [weekKey]: { ...current.workingHours[weekKey], enabled: true },
      },
    }));
    setAdminTab("agenda");
  }

  function blockNextAvailableTime() {
    const nextSlot = buildSlotsForDate(today).find((slot) => slot.available);

    if (!nextSlot) {
      showNotice("Não há horário livre hoje.");
      return;
    }

    setSchedule((current) => ({
      ...current,
      blocks: current.blocks.concat({
        id: makeId("block"),
        date: today,
        start: nextSlot.time,
        end: minutesToTime(timeToMinutes(nextSlot.time) + schedule.slotInterval),
        professional: "Todos",
        reason: "Bloqueio rápido",
      }),
    }));
    setAdminTab("agenda");
  }

  function withNotice(content) {
    return (
      <>
        {content}
        {notice && (
          <div className="noticeOverlay" role="dialog" aria-modal="true">
            <div className="noticeDialog">
              <span>AgendaPro</span>
              <h2>{notice.title || "AgendaPro"}</h2>
              <p>{notice.message}</p>
              <button type="button" className="green" onClick={closeNotice}>
                OK
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  if (cloudLoadState === "missing-slug" || cloudLoadState === "not-found" || cloudLoadState === "error") {
    const slug = currentSlugFromUrl();
    const hasConnectionError = cloudLoadState === "error";

    return withNotice(
      <main className="app">
        <section className="card loginCard">
          <div className="loginBadge">AgendaPro</div>
          <h1>
            {cloudLoadState === "missing-slug"
              ? "Link da barbearia incompleto"
              : hasConnectionError
              ? "Nuvem temporariamente indisponível"
              : "Barbearia não encontrada"}
          </h1>
          <p className="hint">
            {cloudLoadState === "missing-slug"
              ? "Abra pelo link oficial da barbearia: /agendamento/master para clientes ou /painel/master para o painel."
              : hasConnectionError
              ? "Não foi possível carregar os dados online agora. Atualize a página em instantes."
              : `Não encontrei a barbearia "${slug}" ativa na nuvem. Confira o slug no Painel Plataforma ou restaure a barbearia se ela foi arquivada.`}
          </p>
          <a className="greenLink full" href="/plataforma?platform=1">
            Abrir Painel Plataforma
          </a>
          <a className="outlineLink full" href="/">
            Voltar para início
          </a>
        </section>
      </main>
    );
  }

  if (viewMode === "barberGate") {
    return withNotice(
      <main className="app">
        <section className="hero">
          <div className="brand">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <p className="muted">Área da barbearia</p>
              <h1>Confirmar acesso</h1>
            </div>
          </div>
          <button type="button" className="logoutButton" onClick={() => goToClientView()}>
            Voltar
          </button>
        </section>

        <section className="card loginCard">
          <div className="loginBadge">Primeira verificação</div>
          <h2>Acesso do estabelecimento</h2>
          <p className="hint">
            Informe o WhatsApp cadastrado e o nome da barbearia para liberar a tela de login.
          </p>

          <label>WhatsApp da barbearia</label>
          <input
            inputMode="numeric"
            placeholder="(51) 99999-9999"
            value={barberGateWhatsapp}
            onChange={(event) => setBarberGateWhatsapp(formatPhone(event.target.value))}
          />

          <label>Nome da barbearia</label>
          <input
            placeholder={business.name}
            value={barberGateName}
            onChange={(event) => setBarberGateName(event.target.value)}
          />

          {barberGateError && <p className="loginError">{barberGateError}</p>}

          <button type="button" className="green" onClick={verifyBarberIdentity}>
            Continuar para login
          </button>

          <p className="adminNote">
            Essa etapa evita que clientes acessem o painel apenas por encontrar o link.
          </p>
        </section>
      </main>
    );
  }

  if (viewMode === "adminLogin") {
    return withNotice(
      <main className="app">
        <section className="hero">
          <div className="brand">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <p className="muted">Área da barbearia</p>
              <h1>Entrar no painel</h1>
            </div>
          </div>
          <div className="adminHeaderActions">
            <button type="button" className="whatsappButton" onClick={() => goToClientView()}>
              Cliente
            </button>
            <button type="button" className="logoutButton" onClick={logoutAdmin}>
              Voltar
            </button>
          </div>
        </section>

        <section className="card loginCard">
          <div className="loginBadge">Acesso restrito</div>
          <h2>Login da barbearia</h2>
          <p className="hint">
            O painel só aparece para e-mails cadastrados pela plataforma.
          </p>

          <label>E-mail cadastrado</label>
          <input
            type="email"
            placeholder="admin@barbearia.com"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
          />

          <label>Senha</label>
          <input
            type="password"
            placeholder="Digite sua senha"
            value={adminPassword}
            onChange={(event) => setAdminPassword(event.target.value)}
          />

          {adminLoginError && <p className="loginError">{adminLoginError}</p>}

          <button type="button" className="green" onClick={loginAdmin}>
            Entrar com e-mail e senha
          </button>

          <button type="button" className="googleButton" onClick={loginWithGoogle}>
            <span className="googleMark" aria-hidden="true">G</span>
            <span>Entrar com Gmail / Google</span>
          </button>

          <p className="adminNote">
            Use apenas e-mail @gmail.com ou @agendapro.com cadastrado pela plataforma.
            O dono pode alterar a própria senha dentro da aba Conta.
          </p>
        </section>
      </main>
    );
  }

  const viewModel = {
    accessAccounts,
    accessEditorKey,
    activeAdminTab,
    activeFeatureCount,
    activePromotions,
    activeServices,
    addAccessAccount,
    addBlock,
    addBreak,
    addDayOff,
    addProfessional,
    addService,
    adminLoggedIn,
    adminPanelLink,
    adminTabs,
    agendaStatus,
    appointmentManagementLink,
    appointmentNote,
    appointments,
    appearanceMediaAvailable,
    autoConfirmationFeatureEnabled,
    barberConfirmationMessage,
    blockNextAvailableTime,
    business,
    cancelAppointment,
    canContinue,
    canManageAccessAccounts,
    canManageBilling,
    canManageBusinessSettings,
    canUseAdminTab,
    chosenServices,
    clampPercentage,
    clientName,
    clientProfessionals,
    closeToday,
    cloudSaving,
    cloudStatus,
    completeAppointment,
    completedSetupItems,
    commissionsAvailable,
    confirmAppointment,
    confirmAppointmentPayment,
    confirmationSent,
    copyText,
    currentAdminRole,
    currentPlan,
    customerProfiles,
    dataSavedAt,
    dateOptions,
    dateParts,
    featureFlags,
    featureShortcut,
    featureStatusCards,
    finishSchedule,
    formatDate,
    formatDateForMessage,
    formatDateOnly,
    formatPhone,
    getDateAvailability,
    goCheckout,
    goToClientView,
    handleBackgroundUpload,
    handleLogoUpload,
    handlePortfolioImageUpload,
    handleProfessionalPhotoUpload,
    hasChosenService,
    history,
    isDeveloperRole,
    isPlatformDeveloperEmail,
    isFutureOnlyFeature,
    isServiceDeleted,
    isUuid,
    joinWaitlist,
    logoutAdmin,
    loyaltyFeatureEnabled,
    money,
    normalizeRole,
    openAdminArea,
    openToday,
    passwordEditorOpen,
    passwordForm,
    passwordMessage,
    passwordSaving,
    payment,
    pixAvailable,
    pixDiscount,
    pixDiscountValue,
    pixPrice,
    planOptions,
    platformFeatures,
    professional,
    professionals,
    promotionalTotal,
    promotionAvailable,
    promotionDetails,
    promotionValue,
    promotionsOpen,
    publicActionSaving,
    publicAppointment,
    publicScheduleLink,
    range,
    realProfessionals,
    recommendedTime,
    removeAccessAccount,
    removeBlock,
    removeBreak,
    removeDayOff,
    removeProfessional,
    removeService,
    repairText,
    repeatLastService,
    rescheduleAppointment,
    resetDemoData,
    refreshWhatsappIntegrationStatus,
    returningCustomers,
    saveAccessAccountsToCloud,
    saveAppearanceMediaToCloud,
    saveBackgroundsToCloud,
    saveBusinessToCloud,
    saveFeatureFlagsToCloud,
    saveProfessionalsToCloud,
    saveScheduleToCloud,
    saveAppointmentNote,
    saveServicesToCloud,
    schedule,
    scheduleBlocked,
    screen,
    selectedDate,
    selectedPaymentTotal,
    selectedPromotionDetails: promotionDetails.filter((promotion) => promotion.selected),
    selectedPromotions,
    selectedServices,
    selectedTime,
    services,
    servicesText,
    setAccessPasswordEditor,
    setAdminTab,
    setAppointmentNote,
    setBusiness,
    setClientName,
    setFeatureRelease,
    setPayment,
    setPasswordForm,
    setProfessional,
    setPromotionsOpen,
    setRange,
    setSchedule,
    setScreen,
    setSelectedDate,
    setSelectedTime,
    setupItems,
    setupProgress,
    setViewMode,
    setWhatsapp,
    showProfessionalChoice,
    slots,
    startNewSchedule,
    today,
    todayAppointments,
    todayRevenue,
    toggleService,
    togglePromotion,
    topCustomer,
    totalDuration,
    totalPrice,
    upcomingAppointments,
    updateAccessAccount,
    updateBlock,
    updateBreak,
    updateBusinessName,
    updateBusinessSlug,
    updateDayOff,
    updateFeatureFlag,
    updateOwnPassword,
    updateAppointmentNote,
    updateProfessional,
    updatePublicAppointment,
    updateService,
    updateWaitlistStatus,
    updateWorkingDay,
    visibleAdminTabs,
    visualAgendaAvailable,
    waitlist,
    waitlistAvailable,
    waitlistSent,
    weekDays,
    whatsapp,
    whatsappIntegrationStatus,
    withNotice,
  };

  if (viewMode === "admin") {
    return <BarberDashboard model={viewModel} />;
  }

  return <ClientBooking model={viewModel} />;

}

export default function App() {
  return <CoreAgendaProApp />;
}
