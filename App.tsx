// @ts-nocheck
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseAnonKey, supabaseUrl } from "./supabaseClient";
import AppProFeatures from "./ProFeatures";
import BarberDashboard from "./BarberDashboard";
import ClientBooking from "./ClientBooking";
import "./styles.css";

const platformDeveloperEmail = "dyoser2@gmail.com";

const fallbackProfessionalName = "Profissional disponível";

const initialBusiness = {
  name: "AgendaPro",
  logo: "A",
  logoImage: "",
  slug: "agenda-pro",
  ownerEmail: "dyoser2@gmail.com",
  plan: "professional",
  monthlyStatus: "active",
  nextBillingDate: "2026-06-04",
  whatsapp: "5551996238323",
  address: "Rua Exemplo, 123 - Centro",
  mapsUrl: "https://maps.google.com/",
  themeColor: "#22c55e",
  themeColorSecondary: "#4ade80",
  clientBackgroundUrl: "",
  adminBackgroundUrl: "",
  clientBackgroundOpacity: 0.18,
  adminBackgroundOpacity: 0.12,
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

const initialAccessAccounts = [
  {
    id: "access-1",
    email: platformDeveloperEmail,
    role: "Desenvolvedor",
    active: true,
    fixed: true,
    password: "",
    passwordConfirm: "",
  },
];

function normalizeRole(value){const r=String(value||"").trim().toLowerCase();if(["desenvolvedor","developer","platform","plataforma"].includes(r))return"desenvolvedor";if(["dono","owner"].includes(r))return"dono";return"funcionario";}
function roleLabel(value){const r=normalizeRole(value);return r==="desenvolvedor"?"Desenvolvedor":r==="dono"?"Dono":"Funcionário";}
function cloudRoleFromLabel(value){const r=normalizeRole(value);if(r==="desenvolvedor")return"platform";if(r==="dono")return"owner";return"manager";}
function canAccessAdminTab(roleValue,tabId,isOwnerEmail=false){const r=normalizeRole(roleValue);if(r==="desenvolvedor")return true;if(r==="dono"||isOwnerEmail)return true;return["dashboard","agenda","customers"].includes(tabId);}

const initialServices = [
  { name: "Corte de cabelo", duration: 30, price: 35, active: true },
  { name: "Barba", duration: 20, price: 25, active: true },
  { name: "Sobrancelha", duration: 10, price: 15, active: true },
  { name: "Descoloração", duration: 90, price: 120, active: true },
  { name: "Coloração", duration: 70, price: 100, active: true },
];

const initialProfessionals = [
  { name: "Primeiro disponível", active: true, fixed: true },
];

const weekDays = [
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

const initialAppointments = [];

const initialWaitlist = [];

const clientHistory = {};

const adminTabs = [
  { id: "dashboard", label: "Painel" },
  { id: "agenda", label: "Agenda" },
  { id: "customers", label: "Clientes" },
  { id: "services", label: "Serviços" },
  { id: "professionals", label: "Profissionais" },
  { id: "payments", label: "Pagamentos" },
  { id: "appearance", label: "Aparência" },
  { id: "improvements", label: "Melhorias" },
  { id: "account", label: "Conta" },
];

const planOptions = [
  {
    id: "starter",
    name: "Inicial",
    price: "R$ 49/mês",
    description: "Agenda online, serviços, profissionais e painel básico.",
  },
  {
    id: "professional",
    name: "Profissional",
    price: "R$ 89/mês",
    description: "Inclui identidade visual, PIX, melhorias liberadas e agenda inteligente.",
  },
  {
    id: "premium",
    name: "Premium",
    price: "R$ 149/mês",
    description: "Pensado para automações, fidelidade, lista de espera e campanhas.",
  },
];

const platformFeatures = [
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
    key: "promotions",
    title: "Promoções inteligentes",
    description: "Campanhas e descontos configuráveis para clientes.",
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
    title: "Login com Google do cliente",
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

function initialFeatureFlags() {
  return platformFeatures.reduce((result, feature) => {
    result[feature.key] = {
      enabled: feature.key === "pix" || feature.key === "auto_confirmation",
      released: feature.released,
    };
    return result;
  }, {});
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

  const fixes = [
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

function normalizePromotion(item, index = 0) {
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

function normalizePromotions(value, legacy = {}) {
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

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
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
    return makeSlug(parts[1] || "");
  }

  if (!route || reservedRoutes.includes(route)) {
    return "";
  }

  return makeSlug(parts[0] || "");
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
    mapsUrl: row.maps_url || "",
    themeColor: row.theme_color || initialBusiness.themeColor,
    themeColorSecondary: row.theme_color_secondary || initialBusiness.themeColorSecondary,
    clientBackgroundUrl: row.client_background_url || "",
    adminBackgroundUrl: row.admin_background_url || "",
    clientBackgroundOpacity: Number(row.client_background_opacity ?? initialBusiness.clientBackgroundOpacity),
    adminBackgroundOpacity: Number(row.admin_background_opacity ?? initialBusiness.adminBackgroundOpacity),
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
    promotions,
    promotionTitle: repairText(primaryPromotion.title || business.promotionTitle),
    promotionDescription: repairText(primaryPromotion.description || business.promotionDescription),
    promotionDiscount: Number(primaryPromotion.discountPercent ?? business.promotionDiscount ?? 0),
    successTitle: repairText(business.successTitle),
    successMessage: repairText(business.successMessage),
    successFooter: repairText(business.successFooter),
  };
}

function mapAccessAccountsFromCloud(rows, ownerEmail) {
  const cloudAccounts = (rows || []).map((item) => ({
    id: item.id,
    email: item.email,
    role: String(item.email || "").trim().toLowerCase() === platformDeveloperEmail ? "Desenvolvedor" : roleLabel(item.role),
    active: item.active !== false,
    fixed:
      String(item.email || "").trim().toLowerCase() === platformDeveloperEmail ||
      normalizeRole(item.role) === "desenvolvedor",
    password: "",
    passwordConfirm: "",
  }));

  if (cloudAccounts.length) {
    const hasDeveloper = cloudAccounts.some(
      (account) => String(account.email || "").trim().toLowerCase() === platformDeveloperEmail
    );

    if (hasDeveloper) return cloudAccounts;

    return [
      {
        id: "developer-local",
        email: platformDeveloperEmail,
        role: "Desenvolvedor",
        active: true,
        fixed: true,
        password: "",
        passwordConfirm: "",
      },
      ...cloudAccounts,
    ];
  }

  const fallbackOwnerEmail = String(ownerEmail || "").trim().toLowerCase();
  const fallbackAccounts = [...initialAccessAccounts];

  if (fallbackOwnerEmail && fallbackOwnerEmail !== platformDeveloperEmail) {
    fallbackAccounts.push({
      id: "owner-local",
      email: fallbackOwnerEmail,
      role: "Dono",
      active: true,
      fixed: false,
      password: "",
      passwordConfirm: "",
    });
  }

  return fallbackAccounts;
}

function mapFeatureFlagsFromCloud(rows) {
  const flags = initialFeatureFlags();

  (rows || []).forEach((item) => {
    flags[item.feature_key] = {
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
    professionalById[item.id] = item.fixed ? "Primeiro disponível" : item.name;
  });

  return (appointmentRows || []).map((item) => ({
    id: item.id,
    clientName: item.client_name,
    whatsapp: item.whatsapp,
    professional: professionalById[item.professional_id] || "Primeiro disponível",
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
  const [adminTab, setAdminTab] = useState("dashboard");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  useEffect(()=>{if(typeof window!=="undefined"){window.__agendaProAdminTab=adminTab;window.__agendaProViewMode=viewMode;window.__agendaProAdminLoggedIn=adminLoggedIn;}},[adminTab,viewMode,adminLoggedIn]);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [adminContext, setAdminContext] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ next: "", confirm: "" });
  const [passwordSaving, setPasswordSaving] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordEditorOpen, setPasswordEditorOpen] = useState({});
  const [barberGateWhatsapp, setBarberGateWhatsapp] = useState("");
  const [barberGateName, setBarberGateName] = useState("");
  const [barberGateError, setBarberGateError] = useState("");
  const [screen, setScreen] = useState("home");
  const [business, setBusiness] = useState(() =>
    normalizeBusiness(readSavedData(storageKeys.business, initialBusiness))
  );
  const [accessAccounts, setAccessAccounts] = useState(() =>
    readSavedData(storageKeys.accessAccounts, initialAccessAccounts)
  );
  const [featureFlags, setFeatureFlags] = useState(() =>
    readSavedData(storageKeys.featureFlags, initialFeatureFlags())
  );
  const [services, setServices] = useState(() =>
    readSavedData(storageKeys.services, initialServices)
  );
  const [professionals, setProfessionals] = useState(() =>
    readSavedData(storageKeys.professionals, initialProfessionals)
  );
  const [schedule, setSchedule] = useState(() =>
    readSavedData(storageKeys.schedule, initialSchedule)
  );
  const [appointments, setAppointments] = useState(() =>
    readSavedData(storageKeys.appointments, initialAppointments)
  );
  const [waitlist, setWaitlist] = useState(() =>
    readSavedData(storageKeys.waitlist, initialWaitlist)
  );
  const [whatsapp, setWhatsapp] = useState("");
  const [clientName, setClientName] = useState("");
  const [selectedServices, setSelectedServices] = useState([]);
  const [professional, setProfessional] = useState("Primeiro disponível");
  const [range, setRange] = useState("today");
  const [selectedDate, setSelectedDate] = useState(getDateAfterDays(0));
  const [selectedTime, setSelectedTime] = useState("");
  const [payment, setPayment] = useState("");
  const [appointmentNote, setAppointmentNote] = useState("");
  const [promotionsOpen, setPromotionsOpen] = useState(false);
  const [clockTick, setClockTick] = useState(0);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [confirmedToken, setConfirmedToken] = useState("");
  const [publicAppointment, setPublicAppointment] = useState(null);
  const [publicAppointmentToken, setPublicAppointmentToken] = useState("");
  const [publicActionSaving, setPublicActionSaving] = useState("");
  const [dataSavedAt, setDataSavedAt] = useState("");
  const [barbershopId, setBarbershopId] = useState("");
  const [cloudSlug, setCloudSlug] = useState(currentSlugFromUrl());
  const [cloudLoadState, setCloudLoadState] = useState("loading");
  const [cloudStatus, setCloudStatus] = useState("Conectando à nuvem...");
  const [cloudSaving,setRawCloudSaving]=useState("");
  function setCloudSaving(value){setRawCloudSaving(value);if(value&&typeof window!=="undefined"){window.setTimeout(()=>setRawCloudSaving(c=>c===value?"":c),12000);}}
  const [cloudHistory, setCloudHistory] = useState(null);
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [notice, setNotice] = useState(null);
  const [barberConfirmationMessage, setBarberConfirmationMessage] = useState("");

  const today = getDateAfterDays(0);
  const cleanWhatsapp = whatsapp.replace(/\D/g, "");
  const history = cloudHistory || clientHistory[cleanWhatsapp];
  const currentPlan = planOptions.find((plan) => plan.id === business.plan) || planOptions[0];
  const appOrigin = typeof window !== "undefined" ? window.location.origin : "https://agenda.app";
  const routeSlug = makeSlug(
    loadedCloudSlug() || business.slug || cloudSlug || currentSlugFromUrl() || initialBusiness.slug
  );
  const publicScheduleLink = `${appOrigin}/${routeSlug || "barbearia"}`;
  const adminPanelLink = `${appOrigin}/painel/${routeSlug || "barbearia"}`;
  const appointmentManagementLink = confirmedToken
    ? `${publicScheduleLink}?agendamento=${encodeURIComponent(confirmedToken)}`
    : "";
  const scheduleBlocked = business.monthlyStatus === "blocked";
  const pixFeatureEnabled = featureFlags.pix?.released && featureFlags.pix?.enabled;
  const autoConfirmationFeatureEnabled =
    featureFlags.auto_confirmation?.released && featureFlags.auto_confirmation?.enabled;
  const pixAvailable = business.pixEnabled && pixFeatureEnabled;
  const waitlistAvailable = featureFlags.waitlist?.released && featureFlags.waitlist?.enabled;
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
  const canManageBilling = isDeveloperRole;
  const canManageAccessAccounts = isDeveloperRole || isOwnerRole;
  const canManageBusinessSettings = isDeveloperRole || isOwnerRole;
  const canUseAdminTab = (tabId) => canAccessAdminTab(currentAdminRole, tabId, isOwnerEmail);
  const visibleAdminTabs = adminTabs.filter((tab) => canUseAdminTab(tab.id));
  const activeAdminTab = canUseAdminTab(adminTab) ? adminTab : "dashboard";

  useEffect(() => {
    if (adminLoggedIn && adminTab !== activeAdminTab) {
      setAdminTab(activeAdminTab);
    }

    if (typeof window !== "undefined") {
      window.__agendaProAdminTab = activeAdminTab;
    }
  }, [activeAdminTab, adminLoggedIn, adminTab]);

  function handleClearLocalCache() {
    removeSavedData();
    setNotice({ type: "success", message: "Cache local limpo. Recarregando dados da nuvem..." });
    window.setTimeout(() => window.location.reload(), 350);
  }

  function isAdminEmailAllowed(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();

    return (
      normalizedEmail === business.ownerEmail?.trim().toLowerCase() ||
      accessAccounts.some(
        (account) => account.active && account.email.trim().toLowerCase() === normalizedEmail
      )
    );
  }

  function enterAdminWithEmail(email, options = {}) {
    const resetTab = options.resetTab !== false;

    setAdminEmail(email || "");
    setAdminLoggedIn(true);
    setAdminLoginError("");
    setBarberGateError("");
    if (resetTab) {
      setAdminTab("dashboard");
    }
    setViewMode("admin");
    window.scrollTo(0, 0);
  }

  async function handleAuthSession(session) {
    const email = session?.user?.email || "";

    if (!email) return;

    const { data: contextData, error: contextError } = await supabase.rpc("get_my_admin_context");
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
          setAdminTab("dashboard");
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
    setAdminLoginError("Este e-mail Google não está liberado para acessar este painel.");
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
      window.history.pushState({}, "", slug ? `/${slug}` : "/");
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

    supabase.auth.getSession().then(({ data }) => {
      if (active && data?.session) {
        handleAuthSession(data.session);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
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
    const targetSlug = loadedCloudSlug();

    if (cleanWhatsapp.length < 8 || !targetSlug) {
      setCloudHistory(null);
      return;
    }

    let active = true;

    async function loadClientHistory() {
      const { data, error } = await supabase.rpc("get_client_history", {
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
        lastProfessional: "Primeiro disponível",
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

  const clientProfessionals = professionals.filter(
    (item) => (item.active || item.fixed) && item.name.trim() !== ""
  );
  const showProfessionalChoice =
    clientProfessionals.length > 1 || clientProfessionals.some((item) => !item.fixed);

  const chosenServices = useMemo(
    () =>
      services.filter(
        (service, index) => selectedServices.includes(index) && !isServiceDeleted(service)
      ),
    [services, selectedServices]
  );

  const totalDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
  const promotionAvailable = featureFlags.promotions?.released && featureFlags.promotions?.enabled;
  const activePromotions = promotionAvailable
    ? normalizePromotions(business.promotions, business).filter((promotion) => promotion.active)
    : [];
  const promotionDetails = activePromotions.map((promotion) => ({
    ...promotion,
    savings: roundCurrency(Math.min(totalPrice, promotionDiscountAmount(promotion, totalPrice))),
  }));
  const promotionValue = roundCurrency(
    Math.min(
      totalPrice,
      promotionDetails.reduce((sum, promotion) => sum + promotion.savings, 0)
    )
  );
  const promotionalTotal = roundCurrency(Math.max(totalPrice - promotionValue, 0));
  const pixDiscount = pixAvailable ? clampPercentage(business.pixDiscount) : 0;
  const pixDiscountValue = roundCurrency(
    Math.min(promotionalTotal, (promotionalTotal * pixDiscount) / 100)
  );
  const pixPrice = roundCurrency(Math.max(promotionalTotal - pixDiscountValue, 0));
  const selectedPaymentTotal = payment === "pix" && pixAvailable ? pixPrice : promotionalTotal;
  const servicesText = chosenServices.map((service) => service.name).join(" + ");

  const dateCount = range === "today" ? 1 : range === "week" ? 7 : 60;
  const dateOptions = Array.from({ length: dateCount }, (_, index) => getDateAfterDays(index));

  const hasChosenService = selectedServices.length > 0;
  const slots = hasChosenService ? buildSlotsForDate(selectedDate) : [];
  const recommendedTime = slots.find((slot) => slot.available)?.time || "";
  const currentSlot = slots.find((slot) => slot.time === selectedTime);

  const canContinue =
    !scheduleBlocked &&
    cleanWhatsapp.length >= 8 &&
    clientName.trim() !== "" &&
    selectedServices.length > 0 &&
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

  const customerProfiles = useMemo(() => {
    const profiles = {};

    appointments.forEach((appointment) => {
      const phone = String(appointment.whatsapp || "").replace(/\D/g, "");
      if (!phone) return;

      if (!profiles[phone]) {
        profiles[phone] = {
          whatsapp: phone,
          whatsappLink: phone.startsWith("55") ? phone : `55${phone}`,
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
  const loyaltyFeatureEnabled = featureFlags.loyalty?.released && featureFlags.loyalty?.enabled;

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
    const statusLabel = state.released
      ? state.enabled
        ? "Ativo"
        : "Liberado"
      : "Bloqueado";

    return {
      ...feature,
      state,
      shortcut,
      statusLabel,
    };
  });

  const activeFeatureCount = featureStatusCards.filter(
    (feature) => feature.state.released && feature.state.enabled
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

      const { data: businessData, error: businessError } = await supabase
        .from("barbershops")
        .select("*")
        .eq("slug", slug)
        .single();

      if (businessError || !businessData) {
        setBarbershopId("");
        setCloudSlug(slug);
        setCloudLoadState("not-found");
        setCloudStatus("Usando fallback local de emergência. A barbearia ainda não foi encontrada na nuvem.");
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
      ] = await Promise.all([
        supabase
          .from("barbershop_accounts")
          .select("*")
          .eq("barbershop_id", businessData.id)
          .maybeSingle(),
        supabase
          .from("services")
          .select("*")
          .eq("barbershop_id", businessData.id)
          .is("deleted_at", null)
          .order("sort_order", { ascending: true }),
        supabase
          .from("professionals")
          .select("*")
          .eq("barbershop_id", businessData.id)
          .order("fixed", { ascending: false })
          .order("created_at", { ascending: true }),
        supabase.from("working_hours").select("*").eq("barbershop_id", businessData.id),
        supabase.from("schedule_breaks").select("*").eq("barbershop_id", businessData.id),
        supabase.from("days_off").select("*").eq("barbershop_id", businessData.id),
        supabase.from("schedule_blocks").select("*").eq("barbershop_id", businessData.id),
        supabase.rpc("get_admin_appointments", {
          target_slug: businessData.slug,
        }),
        supabase.rpc("get_barbershop_accesses", {
          target_slug: businessData.slug,
        }),
        supabase.from("feature_flags").select("*").eq("barbershop_id", businessData.id),
        supabase
          .from("waitlist")
          .select("*")
          .eq("barbershop_id", businessData.id)
          .order("created_at", { ascending: false }),
      ]);

      const cloudProfessionals = (professionalsResult.data || []).map((item) => ({
        id: item.id,
        name: item.fixed ? "Primeiro disponível" : item.name,
        active: Boolean(item.active),
        fixed: Boolean(item.fixed),
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

      if (appointmentsResult.data?.length) {
        setAppointments(
          mapAppointmentsFromCloud(appointmentsResult.data || [], professionalsResult.data || [])
        );
      }

      setCloudStatus("Conectado à nuvem");
    } catch (error) {
      console.error(error);
      setCloudLoadState("error");
      setCloudStatus("Usando fallback local de emergência. Não foi possível conectar à nuvem.");
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
      "Primeiro disponível",
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
    setNotice({
      title,
      message: repairText(String(message || "")),
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

      if (professional !== "Primeiro disponível") {
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
      showNotice("Informe o WhatsApp, o nome, o serviço e um horário disponível.");
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
      (
        await supabase
          .from("barbershops")
          .select("id")
          .eq("slug", targetSlug)
          .maybeSingle()
      ).data?.id;

    const [appointmentsResult, professionalsResult] = await Promise.all([
      callCloudFunction("get_admin_appointments", {
        target_slug: targetSlug,
      }),
      shopId
        ? supabase.from("professionals").select("*").eq("barbershop_id", shopId)
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

    let latestAppointments = appointments;

    try {
      latestAppointments = (await refreshCloudAppointments()) || appointments;
    } catch (error) {
      const detail = cloudErrorText(error);
      console.error(error);
      setCloudSaving("");
      setCloudStatus(`Não foi possível confirmar a disponibilidade: ${detail}`);
      showNotice(
        `Não foi possível conferir a agenda online agora.\n\nPara evitar horário duplicado, tente novamente em instantes.\n\nDetalhe: ${detail}`
      );
      return;
    }

    const freshSlot = buildSlotsForDate(selectedDate, latestAppointments).find(
      (slot) => slot.time === selectedTime
    );

    if (!freshSlot?.available) {
      showNotice("Esse horário acabou de ficar indisponível. Escolha outro horário.");
      setScreen("home");
      setSelectedTime("");
      setCloudSaving("");
      setCloudStatus("Horário indisponível. Escolha outra opção.");
      return;
    }

    const finalProfessional =
      professional === "Primeiro disponível" ? freshSlot.professional : professional;

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

    let cloudBooking = { id: "", token: "" };

    try {
      cloudBooking = await saveAppointmentToCloud(appointmentData, finalProfessional);
    } catch (error) {
      const detail = cloudErrorText(error);
      console.error(error);
      setCloudSaving("");
      setCloudStatus(`O horário não foi reservado: ${detail}`);
      showNotice(`Não foi possível confirmar este horário.\n\n${detail}`);
      return;
    }

    if (!cloudBooking.id) {
      setCloudSaving("");
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
    const notificationSent = await sendBarberConfirmation(savedAppointment, cloudBooking.id);
    setConfirmationSent(notificationSent);
    setScreen("success");
    setCloudSaving("");
    window.scrollTo(0, 0);
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

  async function sendBarberConfirmation(appointmentData, appointmentId) {
    const message = buildBarberConfirmationMessage(appointmentData, appointmentId);
    setBarberConfirmationMessage(message);

    if (!autoConfirmationFeatureEnabled || !business.automaticConfirmationEnabled) {
      setCloudStatus("Confirmação pronta para envio manual ao WhatsApp da barbearia.");
      return false;
    }

    try {
      const response = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: business.whatsapp,
          message,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const detail = repairText(
          data?.error || "WhatsApp automático ainda não configurado para esta barbearia."
        );
        console.warn("WhatsApp automático não enviado:", data);
        setCloudStatus(detail);
        return false;
      }

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

    let { data, error } = await callCloudFunction("book_appointment_v2", payload);

    if (error && shouldFallbackToLegacyBooking(error)) {
      const legacyPayload = { ...payload };
      delete legacyPayload.note_input;
      const legacyResult = await callCloudFunction("book_appointment", legacyPayload);
      data = legacyResult.data;
      error = legacyResult.error;
    }

    if (error) {
      const detail = cloudErrorText(error);
      console.error("Erro ao salvar online:", error);
      setCloudStatus(`O horário não foi reservado: ${detail}`);
      showNotice(`Não foi possível confirmar este horário.\n\n${detail}`);
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

  function mapPublicAppointment(row) {
    if (!row) return null;
    const item = Array.isArray(row) ? row[0] : row;
    if (!item) return null;

    return {
      token: item.public_token || item.publicToken || publicAppointmentToken,
      clientName: item.client_name || item.clientName || "",
      whatsapp: item.whatsapp || "",
      services: item.service_text || item.services || "",
      professional: item.professional_name || item.professional || "Profissional disponível",
      date: item.appointment_date || item.date || "",
      time: shortTime(item.appointment_time || item.time || ""),
      duration: Number(item.duration || 0),
      total: Number(item.total || 0),
      payment: item.payment_method || item.payment || "local",
      paid: Boolean(item.paid),
      status: item.status || "confirmed",
      rescheduleRequested: Boolean(item.reschedule_requested || item.rescheduleRequested),
      note: item.customer_note || item.note || "",
    };
  }

  async function loadPublicAppointment(token = publicAppointmentToken) {
    const targetSlug = loadedCloudSlug();
    const cleanToken = String(token || "").trim();

    if (!targetSlug || !cleanToken) return;

    setPublicActionSaving("load");

    const { data, error } = await callCloudFunction("get_public_appointment", {
      target_slug: targetSlug,
      public_token_input: cleanToken,
    });

    setPublicActionSaving("");

    if (error) {
      setPublicAppointment(null);
      showNotice("Não foi possível carregar este agendamento. Confira o link ou fale com a barbearia.");
      return;
    }

    const nextAppointment = mapPublicAppointment(data);

    if (!nextAppointment) {
      setPublicAppointment(null);
      showNotice("Agendamento não encontrado para este link.");
      return;
    }

    setPublicAppointment(nextAppointment);
  }

  async function updatePublicAppointment(action) {
    const targetSlug = loadedCloudSlug();
    const token = publicAppointment?.token || publicAppointmentToken;

    if (!targetSlug || !token) return;

    const isCancel = action === "cancel";
    setPublicActionSaving(action);

    const functionName = isCancel
      ? "cancel_appointment_public"
      : "request_appointment_reschedule";

    const { error } = await callCloudFunction(functionName, {
      target_slug: targetSlug,
      public_token_input: token,
    });

    setPublicActionSaving("");

    if (error) {
      showNotice(
        `Não foi possível atualizar o agendamento online.\n\nDetalhe: ${cloudErrorText(error)}`
      );
      return;
    }

    showNotice(isCancel ? "Agendamento cancelado." : "Pedido de remarcação enviado.");
    await loadPublicAppointment(token);
    await refreshCloudAppointments().catch(() => null);
  }

  async function runCloudSave(kind, successMessage, action) {
    setCloudSaving(kind);
    setCloudStatus("Salvando online...");

    try {
      const { error } = await action();

      if (error) {
        console.error(error);
        const detail = cloudErrorText(error);
        setCloudStatus(`Salvo neste aparelho, mas não foi sincronizado online: ${detail}`);
        showNotice(
          `Salvei neste aparelho, mas ainda não sincronizou online.\n\nDetalhe: ${detail}`
        );
        return false;
      }

      setCloudStatus(successMessage);
      showNotice(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      setCloudStatus("Não foi possível salvar online.");
      showNotice("Não foi possível salvar online.");
      return false;
    } finally {
      setCloudSaving("");
    }
  }

  async function callCloudFunction(functionName, payload) {
    if (payload && Object.prototype.hasOwnProperty.call(payload, "target_slug") && !payload.target_slug) {
      return missingLoadedBarbershopResult();
    }

    const result = await supabase.rpc(functionName, payload);

    if (!result.error) return result;

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
        method: "POST",
        headers: {
          apikey: supabaseAnonKey,
          authorization: `Bearer ${supabaseAnonKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const text = await response.text();

      if (!response.ok) {
        return {
          data: null,
          error: {
            message: text || response.statusText,
            code: String(response.status),
          },
        };
      }

      return {
        data: text ? JSON.parse(text) : null,
        error: null,
      };
    } catch (fallbackError) {
      return {
        data: null,
        error: {
          message: cloudErrorText(result.error),
          details: cloudErrorText(fallbackError),
        },
      };
    }
  }

  function saveBusinessToCloud() {
    return runCloudSave("business", "Dados da barbearia salvos online", async () => {
      const { targetSlug, result: missingBarbershop } = requireLoadedBarbershop();
      if (missingBarbershop) return missingBarbershop;

      const nextSlug = business.slug || makeSlug(business.name);
      const result = await callCloudFunction("save_business_settings", {
        target_slug: targetSlug,
        name_input: business.name,
        slug_input: nextSlug,
        owner_email_input: business.ownerEmail || "",
        plan_input: business.plan || "professional",
        monthly_status_input: business.monthlyStatus || "active",
        next_billing_date_input: business.nextBillingDate || null,
        logo_text_input: business.logo || "B",
        logo_url_input: business.logoImage || null,
        whatsapp_input: business.whatsapp,
        address_input: business.address || "",
        maps_url_input: business.mapsUrl || "",
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
        setCloudSlug(nextSlug);
        if (typeof window !== "undefined" && nextSlug && nextSlug !== targetSlug) {
          const parts = window.location.pathname.split("/").filter(Boolean);
          const panelIndex = parts.indexOf("painel");
          const scheduleIndex = parts.indexOf("agendamento");
          if (panelIndex !== -1) window.history.replaceState(null, "", `/painel/${nextSlug}`);
          if (scheduleIndex !== -1) window.history.replaceState(null, "", `/${nextSlug}`);
        }
      }

      if (result.error) return result;

      const promotions = normalizePromotions(business.promotions, business);
      const primaryPromotion = promotions[0] || initialBusiness.promotions[0];
      const multiPromotionResult = await callCloudFunction("save_promotions", {
        target_slug: nextSlug,
        promotions_input: promotions,
      });

      if (!multiPromotionResult.error) return multiPromotionResult;

      return callCloudFunction("save_promotion_settings", {
        target_slug: nextSlug,
        promotion_title_input: primaryPromotion.title || "",
        promotion_description_input: primaryPromotion.description || "",
        promotion_discount_input: Number(primaryPromotion.discountPercent || 0),
      });
    });
  }

  function saveAccessAccountsToCloud() {
    return runCloudSave("access", "Acessos do painel salvos online", async () => {
      const activeAccounts = accessAccounts.filter((account) => account.active !== false);
      const invalidAccount = activeAccounts.find((account) => !String(account.email || "").includes("@"));
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

      if (missingPassword) {
        return {
          error: {
            message:
              "Informe a senha inicial do novo acesso antes de salvar. A senha cria o login no Supabase Auth.",
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

      const result = await callCloudFunction("save_barbershop_accesses", {
        target_slug: targetSlug,
        accesses_input: accessAccounts.map((account) => ({
          id: account.id || null,
          email: account.email.trim().toLowerCase(),
          role: cloudRoleFromLabel(account.role),
          active: Boolean(account.active),
        })),
      });

      if (!result.error) {
        setAccessAccounts((current) =>
          current.map((account) => ({ ...account, password: "", passwordConfirm: "" }))
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

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    if (!token) {
      return { error: { message: "Sessão expirada. Entre novamente para criar logins com senha." } };
    }

    for (const account of accountsWithPassword) {
      const response = await fetch("/api/admin-auth-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          barbershopId,
          barbershopSlug: barbershopId ? cloudSlug : "",
          email: account.email.trim().toLowerCase(),
          password: String(account.password || "").trim(),
          role: cloudRoleFromLabel(account.role),
          active: Boolean(account.active),
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.ok === false) {
        return {
          error: {
            message:
              result.error ||
              `Não foi possível criar o login para ${account.email}. Confira a senha e tente novamente.`,
          },
        };
      }
    }

    return { error: null };
  }

  function saveFeatureFlagsToCloud() {
    return runCloudSave("features", "Melhorias salvas online", () =>
      callCloudFunction("save_feature_flags", {
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
      callCloudFunction("save_services", {
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
      callCloudFunction("save_professionals", {
        target_slug: loadedCloudSlug(),
        professionals_input: professionals.map((item) => ({
          id: item.id || null,
          name: item.fixed ? "Primeiro disponível" : item.name,
          active: Boolean(item.active),
          fixed: Boolean(item.fixed),
        })),
      })
    );
  }

  function saveScheduleToCloud() {
    return runCloudSave("schedule", "Agenda salva online", () =>
      callCloudFunction("save_schedule_settings", {
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

    const { error } = await callCloudFunction("update_appointment_action", {
      target_slug: loadedCloudSlug(),
      appointment_id_input: id,
      paid_input: patch.paid ?? null,
      status_input: patch.status ?? null,
      reschedule_requested_input: patch.rescheduleRequested ?? null,
    });

    if (error) {
      console.error(error);
      setCloudStatus("A ação foi salva neste aparelho, mas não foi sincronizada online.");
      return;
    }

    setCloudStatus("Agendamento atualizado online");
  }

  async function joinWaitlist() {
    if (!waitlistAvailable) {
      showNotice("Lista de espera ainda não está disponível para esta barbearia.");
      return;
    }

    if (cleanWhatsapp.length < 8 || clientName.trim() === "" || selectedServices.length === 0) {
      showNotice("Informe o WhatsApp, o nome e o serviço para entrar na lista de espera.");
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

    const { data, error } = await callCloudFunction("join_waitlist", {
      target_slug: loadedCloudSlug(),
      client_name_input: clientName,
      whatsapp_input: whatsapp,
      preferred_date_input: selectedDate,
      service_text_input: servicesText,
    });

    if (error) {
      console.error(error);
      setCloudStatus("A lista de espera foi salva neste aparelho, mas não foi sincronizada online.");
      return;
    }

    if (data) {
      setWaitlist((current) =>
        current.map((item) =>
          item.id === waitlistData.id ? { ...item, id: String(data) } : item
        )
      );
    }

    setCloudStatus("Cliente adicionado à lista de espera online.");
  }

  async function updateWaitlistStatus(id, status) {
    setWaitlist((current) =>
      status === "removed"
        ? current.filter((item) => item.id !== id)
        : current.map((item) => (item.id === id ? { ...item, status } : item))
    );

    if (!isUuid(id)) return;

    const { error } = await callCloudFunction("update_waitlist_status", {
      target_slug: loadedCloudSlug(),
      waitlist_id_input: id,
      status_input: status,
    });

    if (error) {
      console.error(error);
      setCloudStatus("A lista de espera foi atualizada neste aparelho, mas não foi sincronizada online.");
      return;
    }

    setCloudStatus("Lista de espera atualizada online.");
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    showNotice("Copiado: " + text);
  }

  function handleLogoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBusiness((current) => ({ ...current, logoImage: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function handleBackgroundUpload(field, event) {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setBusiness((current) => ({ ...current, [field]: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  }

  function saveBackgroundsToCloud() {
    return runCloudSave("backgrounds", "Planos de fundo salvos online", async () => {
      const targetSlug = loadedCloudSlug();

      if (!targetSlug) {
        return missingLoadedBarbershopResult();
      }

      return callCloudFunction("save_background_settings", {
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

        return {
          ...account,
          [field]:
            field === "active"
              ? Boolean(value)
              : field === "email"
              ? String(value).trim().toLowerCase()
              : value,
        };
      })
    );
  }

  function removeAccessAccount(index) {
    const account = accessAccounts[index];

    if (!account || account.fixed) return;

    setAccessAccounts((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateFeatureFlag(featureKey, field, value) {
    setFeatureFlags((current) => ({
      ...current,
      [featureKey]: {
        enabled: Boolean(current[featureKey]?.enabled),
        released: Boolean(current[featureKey]?.released),
        [field]: Boolean(value),
      },
    }));
  }

  function isFutureOnlyFeature(featureKey) {
    return (
      featureKey === "google_login" ||
      featureKey === "instagram_booking" ||
      featureKey === "unique_link"
    );
  }

  function setFeatureRelease(featureKey, released) {
    setFeatureFlags((current) => ({
      ...current,
      [featureKey]: {
        enabled: released ? !isFutureOnlyFeature(featureKey) : false,
        released,
      },
    }));
  }

  function featureShortcut(featureKey) {
    if (featureKey === "pix") {
      return { label: "Configurar pagamentos", tab: "payments", disabled: false };
    }

    if (featureKey === "auto_confirmation") {
      return { label: "Editar mensagem final", tab: "appearance", disabled: false };
    }

    if (featureKey === "promotions") {
      return { label: "Configurar promoção", tab: "payments", disabled: false };
    }

    if (featureKey === "waitlist") {
      return { label: "Ver lista de espera", tab: "agenda", disabled: false };
    }

    if (featureKey === "loyalty") {
      return { label: "Ver clientes", tab: "customers", disabled: false };
    }

    if (featureKey === "google_login") {
      return { label: "Login em preparação", tab: "", disabled: true };
    }

    if (featureKey === "instagram_booking") {
      return { label: "Instagram em preparação", tab: "", disabled: true };
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
    const { error } = await callCloudFunction("soft_delete_service", {
      target_slug: loadedCloudSlug(),
      service_id_input: service.id,
    });
    setCloudSaving("");

    if (error) {
      console.error(error);
      setCloudStatus("Serviço excluído neste aparelho, mas ainda não sincronizou online.");
      showNotice("Serviço ocultado neste aparelho. Tente salvar serviços para sincronizar online.");
      return;
    }

    setCloudStatus("Serviço excluído online com segurança.");
  }

  function updateProfessional(index, field, value) {
    const currentProfessional = professionals[index];

    setProfessionals((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: field === "active" ? Boolean(value) : value } : item
      )
    );

    if (field === "active" && value === false && currentProfessional?.name === professional) {
      setProfessional("Primeiro disponível");
    }

    if (field === "name" && currentProfessional?.name === professional) {
      setProfessional(value);
    }

    setSelectedTime("");
  }

  function addProfessional() {
    setProfessionals((current) =>
      current.concat({ name: "Novo profissional", active: true, fixed: false })
    );
  }

  function removeProfessional(index) {
    const professionalToRemove = professionals[index];

    if (!professionalToRemove || professionalToRemove.fixed) return;

    setProfessionals((current) => current.filter((_, itemIndex) => itemIndex !== index));

    if (professional === professionalToRemove.name) {
      setProfessional("Primeiro disponível");
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

  function confirmAppointmentPayment(id) {
    syncAppointmentAction(id, { paid: true });
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, paid: true } : appointment
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
    const typed = String(typedPhone || "").replace(/\D/g, "");
    const registered = String(business.whatsapp || "").replace(/\D/g, "");

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
    setAdminLoginError("");

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo:
            typeof window !== "undefined"
              ? `${window.location.origin}${window.location.pathname}`
              : adminPanelLink,
        },
      });

      if (error) {
        setAdminLoginError("O login com Google ainda não está configurado na autenticação.");
      }
    } catch {
      setAdminLoginError("O login com Google ainda não está configurado na autenticação.");
    }
  }

  async function loginAdmin() {
    const normalizedEmail = adminEmail.trim().toLowerCase();

    if (!normalizedEmail || !adminPassword) {
      setAdminLoginError("Informe o e-mail e a senha cadastrados.");
      return;
    }

    setAdminLoginError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: adminPassword,
      });

      if (error) throw error;

      setAdminPassword("");
      await handleAuthSession(data?.session);
    } catch {
      setAdminLoginError("E-mail ou senha inválidos para este painel.");
    }
  }

  function logoutAdmin() {
    supabase.auth.signOut();
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
      const { error } = await supabase.auth.updateUser({ password: nextPassword });

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

  if (cloudLoadState === "missing-slug" || cloudLoadState === "not-found") {
    const slug = currentSlugFromUrl();

    return withNotice(
      <main className="app">
        <section className="card loginCard">
          <div className="loginBadge">AgendaPro</div>
          <h1>{cloudLoadState === "missing-slug" ? "Link da barbearia incompleto" : "Barbearia não encontrada"}</h1>
          <p className="hint">
            {cloudLoadState === "missing-slug"
              ? "Abra pelo link completo da barbearia, por exemplo /painel/master ou /master."
              : `Não encontrei a barbearia "${slug}" ativa na nuvem. Confira o slug no Painel Plataforma ou restaure a barbearia se ela foi arquivada.`}
          </p>
          <a className="greenLink full" href="/plataforma?platform=1">
            Abrir Painel Plataforma
          </a>
          <a className="outlineLink full" href="/">
            Voltar para inicio
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
            Entrar com Google
          </button>

          <p className="adminNote">
            Use o e-mail cadastrado pela plataforma. O dono pode alterar a própria senha
            dentro da aba Conta.
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
    completedSetupItems,
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
    hasChosenService,
    history,
    isDeveloperRole,
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
    returningCustomers,
    saveAccessAccountsToCloud,
    saveBackgroundsToCloud,
    saveBusinessToCloud,
    saveFeatureFlagsToCloud,
    saveProfessionalsToCloud,
    saveScheduleToCloud,
    saveServicesToCloud,
    schedule,
    scheduleBlocked,
    screen,
    selectedDate,
    selectedPaymentTotal,
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
    updateProfessional,
    updatePublicAppointment,
    updateService,
    updateWaitlistStatus,
    updateWorkingDay,
    visibleAdminTabs,
    waitlist,
    waitlistAvailable,
    waitlistSent,
    weekDays,
    whatsapp,
    withNotice,
  };

  if (viewMode === "admin") {
    return <BarberDashboard model={viewModel} />;
  }

  return <ClientBooking model={viewModel} />;

}

export default function App(){return <><CoreAgendaProApp/><AppProFeatures/></>;}
