// @ts-nocheck
import React from "react";
import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseAnonKey, supabaseUrl } from "./supabaseClient";
import "./styles.css";

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
  automaticConfirmationEnabled: true,
  successTitle: "Agendamento confirmado!",
  successMessage: "Seu horário já está reservado.",
  successFooter: "A barbearia já recebeu os detalhes do atendimento.",
};

const initialAccessAccounts = [
  {
    id: "access-1",
    email: "dyoser2@gmail.com",
    role: "Dono",
    active: true,
    fixed: true,
  },
];

function normalizeRole(value){const r=String(value||"").trim().toLowerCase();if(["desenvolvedor","developer","platform","plataforma"].includes(r))return"desenvolvedor";if(["dono","owner"].includes(r))return"dono";return"funcionario";}
function roleLabel(value){const r=normalizeRole(value);return r==="desenvolvedor"?"Desenvolvedor":r==="dono"?"Dono":"Funcionário";}
function canAccessAdminTab(roleValue,tabId,isOwnerEmail=false){const r=normalizeRole(roleValue);if(r==="desenvolvedor")return true;if(r==="dono"||isOwnerEmail)return true;return["dashboard","agenda","customers","services","appearance"].includes(tabId);}

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

function hexToRgba(hex, opacity) {
  const cleanHex = hex.replace("#", "");
  const red = parseInt(cleanHex.substring(0, 2), 16);
  const green = parseInt(cleanHex.substring(2, 4), 16);
  const blue = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

function safeImageUrl(value) {
  const url = String(value || "").trim();
  return url.startsWith("https://") || url.startsWith("http://") ? url : "";
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

function currentSlugFromUrl() {
  if (typeof window === "undefined") return initialBusiness.slug;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const scheduleIndex = parts.indexOf("agendamento");
  const panelIndex = parts.indexOf("painel");

  return parts[scheduleIndex + 1] || parts[panelIndex + 1] || initialBusiness.slug;
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
    ownerEmail: account?.owner_email || initialBusiness.ownerEmail,
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
    automaticConfirmationEnabled: Boolean(row.automatic_confirmation_enabled),
    successTitle: repairText(row.success_title || initialBusiness.successTitle),
    successMessage: repairText(row.success_message || initialBusiness.successMessage),
    successFooter: repairText(row.success_footer || initialBusiness.successFooter),
  }));
}

function normalizeBusiness(value) {
  const business = mergeWithDefault(initialBusiness, value || {});

  return {
    ...business,
    name: repairText(business.name),
    logo: repairText(business.logo),
    address: repairText(business.address),
    promotionTitle: repairText(business.promotionTitle),
    promotionDescription: repairText(business.promotionDescription),
    successTitle: repairText(business.successTitle),
    successMessage: repairText(business.successMessage),
    successFooter: repairText(business.successFooter),
  };
}

function mapAccessAccountsFromCloud(rows, ownerEmail) {
  const cloudAccounts = (rows || []).map((item) => ({
    id: item.id,
    email: item.email,
    role: roleLabel(item.role),
    active: item.active !== false,
    fixed: normalizeRole(item.role) === "dono",
  }));

  if (cloudAccounts.length) return cloudAccounts;

  return mergeWithDefault(initialAccessAccounts, [
    {
      id: "owner-local",
      email: ownerEmail || initialBusiness.ownerEmail,
      role: "Dono",
      active: true,
      fixed: true,
    },
  ]);
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
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [confirmedId, setConfirmedId] = useState("");
  const [dataSavedAt, setDataSavedAt] = useState("");
  const [barbershopId, setBarbershopId] = useState("");
  const [cloudSlug, setCloudSlug] = useState(currentSlugFromUrl());
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
  const publicScheduleLink = `${appOrigin}/agendamento/${business.slug || "barbearia"}`;
  const adminPanelLink = `${appOrigin}/painel/${business.slug || "barbearia"}`;
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
  const canManageBilling =
    normalizedAdminEmail === normalizedOwnerEmail ||
    normalizeRole(currentAdminAccount?.role) === "desenvolvedor";

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

  function enterAdminWithEmail(email) {
    setAdminEmail(email || "");
    setAdminLoggedIn(true);
    setAdminLoginError("");
    setBarberGateError("");
    setAdminTab("dashboard");
    setViewMode("admin");
    window.scrollTo(0, 0);
  }

  async function handleAuthSession(session) {
    const email = session?.user?.email || "";

    if (!email) return;

    const { data: contextData, error: contextError } = await supabase.rpc("get_my_admin_context");
    const context = Array.isArray(contextData) ? contextData[0] : contextData;

    if (!contextError && context?.access_type === "platform") {
      setAdminContext(context);
      setAdminEmail(email);
      setAdminLoggedIn(true);
      setAdminLoginError("");

      if (!window.location.pathname.toLowerCase().includes("/plataforma")) {
        window.location.href = `${window.location.origin}/plataforma?platform=1`;
      }

      return;
    }

    if (!contextError && context?.access_type === "barbershop" && context?.slug) {
      setAdminContext(context);

      if (context.slug !== (cloudSlug || business.slug)) {
        window.location.href = `${window.location.origin}/painel/${context.slug}`;
        return;
      }

      enterAdminWithEmail(email);
      return;
    }

    if (isAdminEmailAllowed(email)) {
      const path = typeof window !== "undefined" ? window.location.pathname : "";
      const isPanelRoute = path.split("/").filter(Boolean).includes("painel");

      if (viewMode !== "client" || isPanelRoute) {
        enterAdminWithEmail(email);
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
  }, [business.ownerEmail, accessAccounts, adminLoggedIn, viewMode]);

  useEffect(() => {
    if (cleanWhatsapp.length < 8 || !business.slug) {
      setCloudHistory(null);
      return;
    }

    let active = true;

    async function loadClientHistory() {
      const { data, error } = await supabase.rpc("get_client_history", {
        target_slug: business.slug,
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
  }, [cleanWhatsapp, business.slug]);

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
  const promotionDiscount = promotionAvailable ? clampPercentage(business.promotionDiscount) : 0;
  const promotionValue = roundCurrency(
    Math.min(totalPrice, (totalPrice * promotionDiscount) / 100)
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
      tab: "services",
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
      const slug = currentSlugFromUrl();

      const { data: businessData, error: businessError } = await supabase
        .from("barbershops")
        .select("*")
        .eq("slug", slug)
        .single();

      if (businessError || !businessData) {
        setCloudStatus("Usando fallback local de emergência. A barbearia ainda não foi encontrada na nuvem.");
        return;
      }

      setBarbershopId(businessData.id);
      setCloudSlug(businessData.slug);

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

  function appointmentConflict(dateText, startTime, duration, appointmentSource = appointments) {
    return appointmentSource.some((item) => {
      if (item.date !== dateText) return false;
      if (!appointmentBlocksSlot(item)) return false;

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
    if (appointmentConflict(dateText, startTime, duration, appointmentSource)) return false;
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
    const result = [];

    for (let current = start; current + duration <= end; current += interval) {
      const time = minutesToTime(current);
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

        if (appointmentConflict(dateText, time, duration, appointmentSource)) {
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

    setScreen("confirm");
    window.scrollTo(0, 0);
  }

  async function refreshCloudAppointments() {
    const targetSlug = cloudSlug || business.slug;
    if (!targetSlug) return null;

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
    };

    let cloudId = "";

    try {
      cloudId = await saveAppointmentToCloud(appointmentData, finalProfessional);
    } catch (error) {
      const detail = cloudErrorText(error);
      console.error(error);
      setCloudSaving("");
      setCloudStatus(`O horário não foi reservado: ${detail}`);
      showNotice(`Não foi possível confirmar este horário.\n\n${detail}`);
      return;
    }

    if (!cloudId) {
      setCloudSaving("");
      return;
    }

    const savedAppointment = { ...appointmentData, id: cloudId };

    setAppointments((current) =>
      current.some((item) => item.id === savedAppointment.id)
        ? current
        : current.concat(savedAppointment)
    );
    setConfirmedId(cloudId);
    setProfessional(finalProfessional);
    const notificationSent = await sendBarberConfirmation(savedAppointment, cloudId);
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
      "",
      `Total: ${money(appointmentData.total)}`,
      `Forma de pagamento: ${paymentLabel}`,
      `Status do pagamento: ${paymentStatus}`,
      appointmentId ? `Código do agendamento: ${appointmentId}` : "",
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

  async function saveAppointmentToCloud(appointmentData, finalProfessional) {
    if (!business.slug) {
      showNotice("Não foi possível identificar a barbearia para salvar online.");
      setCloudStatus("A barbearia não foi identificada para salvar online.");
      return "";
    }

    setCloudStatus("Reservando horário online...");

    const { data, error } = await callCloudFunction("book_appointment", {
      target_slug: business.slug,
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
    });

    if (error) {
      const detail = cloudErrorText(error);
      console.error("Erro ao salvar online:", error);
      setCloudStatus(`O horário não foi reservado: ${detail}`);
      showNotice(`Não foi possível confirmar este horário.\n\n${detail}`);
      return "";
    }

    if (!data) {
      setCloudStatus("A nuvem não retornou o código do agendamento.");
      showNotice("Não foi possível confirmar este horário. Tente novamente.");
      return "";
    }

    setCloudStatus("Agendamento salvo na nuvem");
    return String(data);
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
      const targetSlug = cloudSlug || business.slug;
      const result = await callCloudFunction("save_business_settings", {
        target_slug: targetSlug,
        name_input: business.name,
        slug_input: business.slug || makeSlug(business.name),
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
        setCloudSlug(business.slug || makeSlug(business.name));
      }

      if (result.error) return result;

      return callCloudFunction("save_promotion_settings", {
        target_slug: business.slug || makeSlug(business.name),
        promotion_title_input: business.promotionTitle || "",
        promotion_description_input: business.promotionDescription || "",
        promotion_discount_input: Number(business.promotionDiscount || 0),
      });
    });
  }

  function saveAccessAccountsToCloud() {
    return runCloudSave("access", "Acessos do painel salvos online", () =>
      callCloudFunction("save_barbershop_accesses", {
        target_slug: cloudSlug || business.slug,
        accesses_input: accessAccounts.map((account) => ({
          id: account.id || null,
          email: account.email.trim().toLowerCase(),
          role:
            account.role === "Dono"
              ? "owner"
              : account.role === "Desenvolvedor"
              ? "platform"
              : "manager",
          active: Boolean(account.active),
        })),
      })
    );
  }

  function saveFeatureFlagsToCloud() {
    return runCloudSave("features", "Melhorias salvas online", () =>
      callCloudFunction("save_feature_flags", {
        target_slug: cloudSlug || business.slug,
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
        target_slug: cloudSlug || business.slug,
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
        target_slug: cloudSlug || business.slug,
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
        target_slug: cloudSlug || business.slug,
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
      target_slug: cloudSlug || business.slug,
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
      target_slug: cloudSlug || business.slug,
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
      target_slug: cloudSlug || business.slug,
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
        email: "novo@email.com",
        role: "Funcionário",
        active: true,
        fixed: false,
      })
    );
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
    setConfirmedId("");
    setConfirmationSent(false);
    setBarberConfirmationMessage("");
    setWaitlistSent(false);
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
      target_slug: cloudSlug || business.slug,
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
          redirectTo: adminPanelLink,
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

  if (viewMode === "admin") {
    if (!adminLoggedIn) {
      return withNotice(
        <main className="app">
          <section className="card loginCard">
            <div className="loginBadge">Acesso restrito</div>
            <h1>Faça login para acessar o painel</h1>
            <button type="button" className="green" onClick={() => setViewMode("adminLogin")}>
              Ir para o login
            </button>
            <button type="button" className="outline" onClick={() => goToClientView()}>
              Voltar para cliente
            </button>
          </section>
        </main>
      );
    }

    return withNotice(
      <main className="app adminApp">
        <section className="hero">
          <div className="brand">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <p className="muted">Painel de gerenciamento</p>
              <h1>{business.name}</h1>
            </div>
          </div>

          <div className="adminHeaderActions">
            <button type="button" className="whatsappButton" onClick={() => goToClientView()}>
              Cliente
            </button>
            <button type="button" className="logoutButton" onClick={logoutAdmin}>
              Sair
            </button>
          </div>
        </section>

        <section className="adminTabs">
          {adminTabs.map((tab) => (
            <button type="button"
              key={tab.id}
              className={adminTab === tab.id ? "activeAdminTab" : ""}
              onClick={() => setAdminTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {adminTab === "dashboard" && (
          <>
            <section className="adminStats">
              <div>
                <span>Hoje</span>
                <strong>{todayAppointments.length}</strong>
                <small>agendamentos</small>
              </div>
              <div>
                <span>Agenda</span>
                <strong>{agendaStatus}</strong>
                <small>status</small>
              </div>
              <div>
                <span>Previsto</span>
                <strong>{money(todayRevenue)}</strong>
                <small>faturamento</small>
              </div>
              <div>
                <span>Clientes</span>
                <strong>{customerProfiles.length}</strong>
                <small>{returningCustomers.length} recorrentes</small>
              </div>
              <div>
                <span>Espera</span>
                <strong>{waitlist.filter((item) => item.status !== "contacted").length}</strong>
                <small>pedidos</small>
              </div>
            </section>

            <section className="card">
              <div className="sectionTitle">
                <h2>Comandos rápidos</h2>
                <span>Ações do dia</span>
              </div>

              <div className="commandGrid">
                <button type="button" onClick={() => setAdminTab("agenda")}>Ver agenda</button>
                <button type="button" onClick={() => setAdminTab("customers")}>Ver clientes</button>
                <button type="button" onClick={blockNextAvailableTime}>Bloquear próximo horário</button>
                <button type="button" onClick={closeToday}>Fechar hoje</button>
                <button type="button" onClick={openToday}>Liberar hoje</button>
                <button type="button"
                  onClick={() => {
                    addService();
                    setAdminTab("services");
                  }}
                >
                  Novo serviço
                </button>
                <button type="button"
                  onClick={() => {
                    addProfessional();
                    setAdminTab("services");
                  }}
                >
                  Novo profissional
                </button>
                <button type="button"
                  disabled={!featureFlags.pix?.released}
                  onClick={() => {
                    setBusiness((current) => ({ ...current, pixEnabled: !current.pixEnabled }));
                    updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    setAdminTab("payments");
                  }}
                >
                  {pixAvailable ? "Desativar PIX" : "Ativar PIX"}
                </button>
                <button type="button"
                  onClick={() => goToClientView()}
                >
                  Ver tela do cliente
                </button>
              </div>
            </section>

            <section className="card setupCard">
              <div className="sectionTitle">
                <h2>Checklist do app</h2>
                <span>{completedSetupItems}/{setupItems.length} pronto</span>
              </div>

              <div className="setupProgress">
                <span style={{ width: `${setupProgress}%` }} />
              </div>

              <div className="setupList">
                {setupItems.map((item) => (
                  <button type="button"
                    className={item.done ? "setupItem setupDone" : "setupItem"}
                    key={item.label}
                    onClick={() => setAdminTab(item.tab)}
                  >
                    <span>{item.done ? "OK" : "Pendente"}</span>
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="card resourceCard">
              <div className="sectionTitle">
                <h2>Recursos do app</h2>
                <span>{activeFeatureCount} ativos</span>
              </div>

              <div className="resourceGrid">
                {featureStatusCards.map((feature) => (
                  <button type="button"
                    className={[
                      "resourceItem",
                      feature.state.released ? "resourceReleased" : "resourceLocked",
                      feature.state.enabled ? "resourceEnabled" : "",
                    ].join(" ")}
                    key={feature.key}
                    onClick={() => {
                      if (feature.state.released && !feature.shortcut.disabled && feature.shortcut.tab) {
                        setAdminTab(feature.shortcut.tab);
                      } else {
                        setAdminTab("improvements");
                      }
                    }}
                  >
                    <span>{feature.statusLabel}</span>
                    <strong>{feature.title}</strong>
                    <small>
                      {feature.state.released && !feature.shortcut.disabled
                        ? feature.shortcut.label
                        : "Gerenciar em Melhorias"}
                    </small>
                  </button>
                ))}
              </div>
            </section>

            <section className="card storageCard">
              <div className="sectionTitle">
                <h2>Sincronização</h2>
                <span>Local e online</span>
              </div>

              <p className="hint">
                O app mantém uma cópia local para abrir rápido e salva as configurações
                principais na nuvem quando você usa os botões de salvar.
              </p>

              <div className="storageGrid">
                <div>
                  <span>Nuvem</span>
                  <strong>{cloudStatus}</strong>
                </div>
                <div>
                  <span>Barbearia</span>
                  <strong>{business.name}</strong>
                </div>
                <div>
                  <span>Serviços</span>
                  <strong>{services.length}</strong>
                </div>
                <div>
                  <span>Profissionais</span>
                  <strong>{professionals.filter((item) => item.active).length}</strong>
                </div>
                <div>
                  <span>Acessos</span>
                  <strong>{accessAccounts.filter((account) => account.active).length}</strong>
                </div>
                <div>
                  <span>Último salvamento</span>
                  <strong>{dataSavedAt || "Automático"}</strong>
                </div>
              </div>

              {canManageBilling && (
                <button type="button" className="dangerButton" onClick={resetDemoData}>
                  Restaurar demonstração
                </button>
              )}
            </section>

            <section className="card">
              <div className="sectionTitle">
                <h2>Próximos horários</h2>
                <span>{upcomingAppointments.length} registros</span>
              </div>

              {upcomingAppointments.length === 0 && (
                <p className="hint">Ainda não há próximos agendamentos.</p>
              )}

              {upcomingAppointments.map((appointment) => (
                <div className="adminItem compactAppointment" key={appointment.id}>
                  <strong>
                    {formatDate(appointment.date)} - {appointment.time}
                  </strong>
                  <p>
                    {appointment.clientName} com {appointment.professional}
                  </p>
                  <p>{appointment.services}</p>
                </div>
              ))}
            </section>
          </>
        )}

        <section className={adminTab === "customers" ? "card customerCard" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Clientes</h2>
            <span>Histórico e recorrência</span>
          </div>

          <div className="customerSummary">
            <div>
              <span>Total</span>
              <strong>{customerProfiles.length}</strong>
              <small>clientes com histórico</small>
            </div>
            <div>
              <span>Recorrentes</span>
              <strong>{returningCustomers.length}</strong>
              <small>mais de uma visita</small>
            </div>
            <div>
              <span>Melhor cliente</span>
              <strong>{topCustomer?.name || "Sem dados"}</strong>
              <small>{topCustomer ? `${topCustomer.visits} visitas` : "Aguardando agendamento"}</small>
            </div>
          </div>

          <div className={loyaltyFeatureEnabled ? "loyaltyNotice activeLoyalty" : "loyaltyNotice"}>
            <strong>{loyaltyFeatureEnabled ? "Fidelidade ativa" : "Fidelidade bloqueada"}</strong>
            <p>
              {loyaltyFeatureEnabled
                ? "Use o histórico para oferecer vantagens aos clientes recorrentes."
                : "Libere a fidelidade em Melhorias para transformar visitas em recompensas."}
            </p>
            {!loyaltyFeatureEnabled && (
              <button type="button" onClick={() => setAdminTab("improvements")}>
                Liberar fidelidade
              </button>
            )}
          </div>

          {customerProfiles.length === 0 && (
            <p className="hint">Os clientes aparecem aqui depois dos primeiros agendamentos.</p>
          )}

          <div className="customerList">
            {customerProfiles.map((customer) => (
              <div className="customerItem" key={customer.whatsapp}>
                <div className="customerAvatar">{customer.name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <strong>{customer.name}</strong>
                  <p>WhatsApp: {customer.whatsapp}</p>
                  <p>Último atendimento: {formatDate(customer.lastDate)} às {customer.lastTime}</p>
                  <p>{customer.lastServices}</p>
                  <div className="customerBadges">
                    <span>{customer.visits} visitas</span>
                    <span>{money(customer.revenue)}</span>
                    {customer.pendingPayment > 0 && <span>Pagamento pendente</span>}
                    {loyaltyFeatureEnabled && customer.visits >= 5 && <span>Prêmio sugerido</span>}
                  </div>
                </div>
                <a
                  className="whatsappAction"
                  href={`https://wa.me/${customer.whatsappLink}?text=${encodeURIComponent(
                    `Olá, ${customer.name}! Aqui é da ${business.name}.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              </div>
            ))}
          </div>
        </section>

        <section className={adminTab === "agenda" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Agenda real</h2>
            <span>Funcionamento</span>
          </div>

          <label>Intervalo entre horários disponíveis</label>
          <input
            type="number"
            min="10"
            step="5"
            value={schedule.slotInterval}
            onChange={(event) =>
              setSchedule({ ...schedule, slotInterval: Math.max(Number(event.target.value) || 30, 10) })
            }
          />

          <button type="button" className="green" onClick={saveScheduleToCloud}>
            {cloudSaving === "schedule" ? "Salvando agenda..." : "Salvar agenda"}
          </button>

          <div className="weeklyGrid">
            {weekDays.map((day) => {
              const config = schedule.workingHours[day.key];

              return (
                <div className={config.enabled ? "dayRow" : "dayRow closedDay"} key={day.key}>
                  <button type="button"
                    className={config.enabled ? "dayToggle activeDay" : "dayToggle"}
                    onClick={() => updateWorkingDay(day.key, "enabled", !config.enabled)}
                  >
                    {day.short}
                  </button>

                  <div className="dayInfo">
                    <strong>{day.label}</strong>
                    <span>{config.enabled ? `${config.start} até ${config.end}` : "Fechado"}</span>
                  </div>

                  <div className="dayTimes">
                    <input
                      aria-label={`Abertura de ${day.label}`}
                      type="time"
                      value={config.start}
                      disabled={!config.enabled}
                      onChange={(event) => updateWorkingDay(day.key, "start", event.target.value)}
                    />
                    <input
                      aria-label={`Fechamento de ${day.label}`}
                      type="time"
                      value={config.end}
                      disabled={!config.enabled}
                      onChange={(event) => updateWorkingDay(day.key, "end", event.target.value)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className={adminTab === "agenda" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Intervalos</h2>
            <span>Almoço e pausas</span>
          </div>

          {schedule.breaks.map((item, index) => (
            <div className="adminItem" key={item.id}>
              <label>Nome</label>
              <input value={item.name} onChange={(event) => updateBreak(index, "name", event.target.value)} />

              <div className="timePair">
                <div>
                  <label>Início</label>
                  <input type="time" value={item.start} onChange={(event) => updateBreak(index, "start", event.target.value)} />
                </div>
                <div>
                  <label>Fim</label>
                  <input type="time" value={item.end} onChange={(event) => updateBreak(index, "end", event.target.value)} />
                </div>
              </div>

              <button type="button" className="dangerButton" onClick={() => removeBreak(index)}>
                Remover intervalo
              </button>
            </div>
          ))}

          <button type="button" className="black" onClick={addBreak}>
            Adicionar intervalo
          </button>
        </section>

        <section className={adminTab === "agenda" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Folgas</h2>
            <span>Dias fechados</span>
          </div>

          {schedule.daysOff.map((item, index) => (
            <div className="adminItem" key={item.id}>
              <label>Data</label>
              <input type="date" value={item.date} onChange={(event) => updateDayOff(index, "date", event.target.value)} />
              <label>Motivo</label>
              <input value={item.reason} onChange={(event) => updateDayOff(index, "reason", event.target.value)} />
              <button type="button" className="dangerButton" onClick={() => removeDayOff(index)}>
                Remover folga
              </button>
            </div>
          ))}

          <button type="button" className="black" onClick={addDayOff}>
            Adicionar folga
          </button>
        </section>

        <section className={adminTab === "agenda" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Bloqueios</h2>
            <span>Imprevistos</span>
          </div>

          {schedule.blocks.map((item, index) => (
            <div className="adminItem" key={item.id}>
              <label>Data</label>
              <input type="date" value={item.date} onChange={(event) => updateBlock(index, "date", event.target.value)} />

              <div className="timePair">
                <div>
                  <label>Início</label>
                  <input type="time" value={item.start} onChange={(event) => updateBlock(index, "start", event.target.value)} />
                </div>
                <div>
                  <label>Fim</label>
                  <input type="time" value={item.end} onChange={(event) => updateBlock(index, "end", event.target.value)} />
                </div>
              </div>

              <label>Profissional</label>
              <select value={item.professional} onChange={(event) => updateBlock(index, "professional", event.target.value)}>
                <option value="Todos">Todos</option>
                {realProfessionals().map((professionalItem) => (
                  <option value={professionalItem} key={professionalItem}>
                    {professionalItem}
                  </option>
                ))}
              </select>

              <label>Motivo</label>
              <input value={item.reason} onChange={(event) => updateBlock(index, "reason", event.target.value)} />

              <button type="button" className="dangerButton" onClick={() => removeBlock(index)}>
                Remover bloqueio
              </button>
            </div>
          ))}

          <button type="button" className="black" onClick={addBlock}>
            Adicionar bloqueio
          </button>
        </section>

        <section className={adminTab === "services" ? "card" : "hiddenPanel"}>
          <h2>Serviços</h2>
          {services
            .map((service, index) => ({ ...service, originalIndex: index }))
            .filter((service) => !isServiceDeleted(service))
            .map((service) => (
            <div className="adminItem" key={service.id || service.originalIndex}>
              <label>Nome</label>
              <input value={service.name} onChange={(event) => updateService(service.originalIndex, "name", event.target.value)} />

              <div className="timePair">
                <div>
                  <label>Tempo</label>
                  <input type="number" value={service.duration} onChange={(event) => updateService(service.originalIndex, "duration", event.target.value)} />
                </div>
                <div>
                  <label>Preço</label>
                  <input type="number" value={service.price} onChange={(event) => updateService(service.originalIndex, "price", event.target.value)} />
                </div>
              </div>

              <button type="button" className={service.active ? "selected" : ""} onClick={() => updateService(service.originalIndex, "active", !service.active)}>
                {service.active ? "Serviço ativo" : "Serviço inativo"}
              </button>
              <button type="button" className="dangerButton" onClick={() => removeService(service.originalIndex)}>
                Excluir serviço
              </button>
            </div>
          ))}

          <button type="button" className="black" onClick={addService}>
            Adicionar serviço
          </button>

          <button type="button" className="green" onClick={saveServicesToCloud}>
            {cloudSaving === "services" ? "Salvando serviços..." : "Salvar serviços"}
          </button>
        </section>

        <section className={adminTab === "services" ? "card" : "hiddenPanel"}>
          <h2>Profissionais</h2>
          {professionals.map((item, index) => (
            <div className="adminItem barberItem" key={index}>
              <div className="barberHeader">
                <div>
                  <strong>{item.name}</strong>
                  <p>
                    {item.fixed
                      ? "Escolha automática quando não houver profissional cadastrado"
                      : item.active
                      ? "Disponível para agendamentos"
                      : "Oculto para o cliente"}
                  </p>
                </div>
                <button type="button"
                  className={item.active ? "statusPill activeStatus" : "statusPill"}
                  disabled={item.fixed}
                  onClick={() => updateProfessional(index, "active", !item.active)}
                >
                  {item.active ? "Ativo" : "Inativo"}
                </button>
              </div>

              <label>Nome</label>
              <input
                value={item.name}
                disabled={item.fixed}
                onChange={(event) => updateProfessional(index, "name", event.target.value)}
              />
              {item.fixed && (
                <p className="hint">Esta opção escolhe automaticamente um profissional disponível.</p>
              )}
              {!item.fixed && (
                <button type="button" className="dangerButton" onClick={() => removeProfessional(index)}>
                  Remover profissional
                </button>
              )}
            </div>
          ))}

          <button type="button" className="black" onClick={addProfessional}>
            Adicionar profissional
          </button>

          <button type="button" className="green" onClick={saveProfessionalsToCloud}>
            {cloudSaving === "professionals"
              ? "Salvando profissionais..."
              : "Salvar profissionais"}
          </button>
        </section>

        <section className={adminTab === "payments" ? "card" : "hiddenPanel"}>
          <h2>Pagamentos</h2>
          <button type="button"
            className={pixAvailable ? "selected" : ""}
            disabled={!featureFlags.pix?.released}
            onClick={() => {
              setBusiness({ ...business, pixEnabled: !business.pixEnabled });
              updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
            }}
          >
            {pixAvailable ? "PIX antecipado ativo" : "PIX antecipado desativado"}
          </button>

          <label>Chave PIX</label>
          <input value={business.pixKey} onChange={(event) => setBusiness({ ...business, pixKey: event.target.value })} />

          <label>Desconto antecipado (%)</label>
          <input
            type="number"
            min="0"
            max="80"
            value={business.pixDiscount}
            onChange={(event) =>
              setBusiness({ ...business, pixDiscount: clampPercentage(event.target.value) })
            }
          />

          <h2>Opcionais</h2>
          <p className="hint">
            Promoções, lista de espera e fidelidade ficam bloqueados até serem liberados
            na aba Melhorias.
          </p>

          <div className={featureFlags.promotions?.released ? "promoConfig" : "promoConfig lockedPromo"}>
            <div className="sectionTitle">
              <h2>Promoções inteligentes</h2>
              <span>{promotionAvailable ? "Ativa" : "Inativa"}</span>
            </div>
            <p className="hint">
              Libere em Melhorias, configure o desconto aqui e salve as alterações.
            </p>

            <label>Nome da promoção</label>
            <input
              disabled={!featureFlags.promotions?.released}
              value={business.promotionTitle || ""}
              onChange={(event) => setBusiness({ ...business, promotionTitle: event.target.value })}
            />

            <label>Descrição da promoção</label>
            <input
              disabled={!featureFlags.promotions?.released}
              value={business.promotionDescription || ""}
              onChange={(event) =>
                setBusiness({ ...business, promotionDescription: event.target.value })
              }
            />

            <label>Desconto da promoção (%)</label>
            <input
              disabled={!featureFlags.promotions?.released}
              type="number"
              min="0"
              max="80"
              value={business.promotionDiscount || 0}
              onChange={(event) =>
                setBusiness({ ...business, promotionDiscount: clampPercentage(event.target.value) })
              }
            />
          </div>

          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando pagamentos..." : "Salvar pagamentos"}
          </button>
        </section>

        <section className={adminTab === "improvements" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Melhorias</h2>
            <span>Liberação da plataforma</span>
          </div>

          <p className="hint">
            {canManageBilling
              ? `Novos recursos começam bloqueados e são liberados por atualização ou pelo plano da mensalidade. Plano atual: ${currentPlan.name}.`
              : "Novos recursos começam bloqueados e são liberados pela plataforma quando estiverem disponíveis para esta conta."}
          </p>

          <div className="featureGrid">
            {platformFeatures.map((feature) => {
              const featureState = featureFlags[feature.key] || {
                enabled: false,
                released: false,
              };
              const shortcut = featureShortcut(feature.key);

              return (
                <div
                  className={[
                    "featureCard",
                    featureState.released ? "availableFeature" : "lockedFeature",
                    featureState.released && featureState.enabled ? "activeFeature" : "",
                  ].join(" ")}
                  key={feature.key}
                >
                <div className="featureHeader">
                  <strong>{feature.title}</strong>
                  <span>
                    {featureState.released
                      ? featureState.enabled
                        ? "Ativo"
                        : "Liberado"
                      : "Bloqueado"}
                  </span>
                </div>
                <p>{feature.description}</p>

                <div className="featureDestination">
                  <span>
                    {isFutureOnlyFeature(feature.key)
                      ? "Em preparação"
                      : featureState.released
                      ? featureState.enabled
                        ? shortcut.label
                        : "Liberado, aguardando ativação"
                      : "Aguardando liberação"}
                  </span>
                </div>

                <div className="featureActions">
                  <button type="button"
                    onClick={() => setFeatureRelease(feature.key, !featureState.released)}
                  >
                    {featureState.released ? "Bloquear recurso" : "Liberar recurso"}
                  </button>

                  <button type="button"
                    disabled={
                      !featureState.released ||
                      feature.key === "pix" ||
                      feature.key === "auto_confirmation" ||
                      isFutureOnlyFeature(feature.key)
                    }
                    onClick={() =>
                      updateFeatureFlag(feature.key, "enabled", !featureState.enabled)
                    }
                  >
                    {featureState.enabled ? "Desativar na barbearia" : "Ativar na barbearia"}
                  </button>
                </div>

                {feature.key === "pix" && featureState.released && (
                  <button type="button"
                    onClick={() => {
                      setBusiness({ ...business, pixEnabled: !business.pixEnabled });
                      updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    }}
                  >
                    {pixAvailable ? "PIX ativo no checkout" : "Ativar PIX no checkout"}
                  </button>
                )}

                {feature.key === "auto_confirmation" &&
                  featureState.released && (
                    <button type="button"
                      onClick={() => {
                        setBusiness({
                          ...business,
                          automaticConfirmationEnabled: !business.automaticConfirmationEnabled,
                        });
                        updateFeatureFlag(
                          "auto_confirmation",
                          "enabled",
                          !featureFlags.auto_confirmation?.enabled
                        );
                      }}
                    >
                      {autoConfirmationFeatureEnabled && business.automaticConfirmationEnabled
                        ? "Confirmação ativa"
                        : "Ativar confirmação"}
                    </button>
                  )}

                  {featureState.released && (
                    <button type="button"
                      className="featureShortcut"
                      disabled={shortcut.disabled}
                      onClick={() => {
                        if (!shortcut.disabled && shortcut.tab) {
                          setAdminTab(shortcut.tab);
                        }
                      }}
                    >
                      {shortcut.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="green" onClick={saveFeatureFlagsToCloud}>
            {cloudSaving === "features" ? "Salvando melhorias..." : "Salvar melhorias"}
          </button>
        </section>

        <section className={adminTab === "account" ? "card accountCard" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Conta</h2>
            <span>{canManageBilling ? "Mensalidade e link" : "Renovação e link"}</span>
          </div>

          <div className="accountHero">
            <span>App da barbearia</span>
            <strong>{business.slug || "barbearia"}</strong>
            <p>
              Cada barbearia tem um app próprio, definido pelo identificador do link.
              O cliente acessa o agendamento; o responsável acessa o painel protegido.
            </p>
          </div>

          <div className="passwordPanel">
            <h3>Alterar senha de acesso</h3>
            <p className="hint">
              Esta senha é do login da barbearia no Supabase Auth. Ela vale para o e-mail
              que está conectado neste painel.
            </p>
            <label>Nova senha</label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
              placeholder="mínimo 6 caracteres"
            />
            <label>Confirmar nova senha</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
              placeholder="repita a nova senha"
            />
            {passwordMessage && <p className="adminNote">{passwordMessage}</p>}
            <button
              type="button"
              className="black"
              disabled={passwordSaving === "password"}
              onClick={updateOwnPassword}
            >
              {passwordSaving === "password" ? "Alterando senha..." : "Alterar minha senha"}
            </button>
          </div>

          <label>E-mail responsável</label>
          <input
            type="email"
            value={business.ownerEmail || ""}
            onChange={(event) => setBusiness({ ...business, ownerEmail: event.target.value })}
          />

          <label>Identificador do link</label>
          <input
            value={business.slug || ""}
            onChange={(event) => updateBusinessSlug(event.target.value)}
            placeholder="agenda-pro"
          />

          <label>Link para divulgar</label>
          <input value={publicScheduleLink} readOnly />

          <button type="button" className="black" onClick={() => copyText(publicScheduleLink)}>
            Copiar link de agendamento
          </button>

          <label>Link do painel</label>
          <input value={adminPanelLink} readOnly />

          <button type="button" className="outline" onClick={() => copyText(adminPanelLink)}>
            Copiar link do painel
          </button>

          <div className="accessHeader">
            <div>
              <span>Acessos ao painel</span>
              <strong>{accessAccounts.filter((account) => account.active).length} ativos</strong>
            </div>
            <button type="button" onClick={addAccessAccount}>Adicionar</button>
          </div>

          <div className="accessList">
            {accessAccounts.map((account, index) => (
              <div className="accessItem" key={account.id || index}>
                <label>E-mail de acesso</label>
                <input
                  type="email"
                  value={account.email}
                  disabled={account.fixed}
                  onChange={(event) => updateAccessAccount(index, "email", event.target.value)}
                />

                <div className="timePair">
                  <div>
                    <label>Função</label>
                    <select
                      value={account.role}
                      disabled={account.fixed}
                      onChange={(event) => updateAccessAccount(index, "role", event.target.value)}
                    >
                      <option value="Dono">Dono</option>
                      <option value="Funcionário">Funcionário</option>
                      <option value="Desenvolvedor">Desenvolvedor</option>
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <button type="button"
                      className={account.active ? "selected" : ""}
                      disabled={account.fixed}
                      onClick={() => updateAccessAccount(index, "active", !account.active)}
                    >
                      {account.active ? "Ativo" : "Inativo"}
                    </button>
                  </div>
                </div>

                {account.fixed && (
                  <p className="hint">Acesso principal protegido para esta barbearia.</p>
                )}

                {!account.fixed && (
                  <button type="button" className="dangerButton" onClick={() => removeAccessAccount(index)}>
                    Remover acesso
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="button" className="green" onClick={saveAccessAccountsToCloud}>
            {cloudSaving === "access" ? "Salvando acessos..." : "Salvar acessos"}
          </button>

          {canManageBilling ? (
            <>
              <div className="planHeader">
                <div>
                  <span>Plano atual</span>
                  <strong>{currentPlan.name}</strong>
                </div>
                <b>{currentPlan.price}</b>
              </div>

              <div className="planGrid">
                {planOptions.map((plan) => (
                  <button type="button"
                    key={plan.id}
                    className={business.plan === plan.id ? "planCard activePlan" : "planCard"}
                    onClick={() => setBusiness({ ...business, plan: plan.id })}
                  >
                    <span>{plan.name}</span>
                    <strong>{plan.price}</strong>
                    <small>{plan.description}</small>
                  </button>
                ))}
              </div>

              <label>Status da mensalidade</label>
              <select
                value={business.monthlyStatus || "active"}
                onChange={(event) => setBusiness({ ...business, monthlyStatus: event.target.value })}
              >
                <option value="active">Ativa</option>
                <option value="trial">Teste grátis</option>
                <option value="pending">Pagamento pendente</option>
                <option value="blocked">Bloqueada</option>
              </select>

              <label>Próxima cobrança</label>
              <input
                type="date"
                value={business.nextBillingDate || ""}
                onChange={(event) => setBusiness({ ...business, nextBillingDate: event.target.value })}
              />

              <p className="adminNote">
                Esta área administrativa aparece apenas para o dono da conta.
              </p>

              <button type="button" className="green" onClick={saveBusinessToCloud}>
                {cloudSaving === "business" ? "Salvando conta..." : "Salvar conta"}
              </button>
            </>
          ) : (
            <div className="planHeader renewalOnly">
              <div>
                <span>Renovação do acesso</span>
                <strong>{formatDateOnly(business.nextBillingDate)}</strong>
              </div>
            </div>
          )}
        </section>

        <section className={adminTab === "appearance" ? "card" : "hiddenPanel"}>
          <h2>Aparência</h2>

          <label>Nome do estabelecimento</label>
          <input value={business.name} onChange={(event) => updateBusinessName(event.target.value)} />

          <label>Logo/letra</label>
          <input value={business.logo} onChange={(event) => setBusiness({ ...business, logo: event.target.value.slice(0, 2) })} />

          <label>Subir logo em imagem</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {business.logoImage && (
            <button type="button"
              className="dangerButton"
              onClick={() => setBusiness({ ...business, logoImage: "" })}
            >
              Remover logo enviada
            </button>
          )}

          <div className="brandPreview">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <span>Prévia da marca</span>
              <strong>{business.name}</strong>
            </div>
          </div>

          <div className="colorGrid">
            <div>
              <label>Cor principal</label>
              <input
                className="colorInput"
                type="color"
                value={business.themeColor}
                onChange={(event) => setBusiness({ ...business, themeColor: event.target.value })}
              />
            </div>
            <div>
              <label>Cor de apoio</label>
              <input
                className="colorInput"
                type="color"
                value={business.themeColorSecondary}
                onChange={(event) =>
                  setBusiness({ ...business, themeColorSecondary: event.target.value })
                }
              />
            </div>
          </div>

          <div className="adminItem">
            <h3>Plano de fundo</h3>
            <label>Imagem de fundo do cliente</label>
            <input
              value={business.clientBackgroundUrl || ""}
              onChange={(event) =>
                setBusiness({ ...business, clientBackgroundUrl: event.target.value })
              }
              placeholder="https://site.com/fundo-cliente.jpg"
            />
            <label>Opacidade do fundo do cliente</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={business.clientBackgroundOpacity}
              onChange={(event) =>
                setBusiness({ ...business, clientBackgroundOpacity: Number(event.target.value) })
              }
            />
            <button type="button"
              className="outline"
              onClick={() => setBusiness({ ...business, clientBackgroundUrl: "" })}
            >
              Excluir fundo do cliente
            </button>

            <label>Imagem de fundo do painel</label>
            <input
              value={business.adminBackgroundUrl || ""}
              onChange={(event) =>
                setBusiness({ ...business, adminBackgroundUrl: event.target.value })
              }
              placeholder="https://site.com/fundo-painel.jpg"
            />
            <label>Opacidade do fundo do painel</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={business.adminBackgroundOpacity}
              onChange={(event) =>
                setBusiness({ ...business, adminBackgroundOpacity: Number(event.target.value) })
              }
            />
            <button type="button"
              className="outline"
              onClick={() => setBusiness({ ...business, adminBackgroundUrl: "" })}
            >
              Excluir fundo do painel
            </button>
          </div>

          <label>WhatsApp</label>
          <input value={business.whatsapp} onChange={(event) => setBusiness({ ...business, whatsapp: event.target.value })} />

          <label>Endereço da barbearia</label>
          <input
            value={business.address}
            onChange={(event) => setBusiness({ ...business, address: event.target.value })}
          />

          <label>Link do Google Maps</label>
          <input
            value={business.mapsUrl}
            onChange={(event) => setBusiness({ ...business, mapsUrl: event.target.value })}
          />

          <label>Título da tela final</label>
          <input value={business.successTitle} onChange={(event) => setBusiness({ ...business, successTitle: event.target.value })} />

          <label>Mensagem principal</label>
          <input value={business.successMessage} onChange={(event) => setBusiness({ ...business, successMessage: event.target.value })} />

          <label>Mensagem final</label>
          <input value={business.successFooter} onChange={(event) => setBusiness({ ...business, successFooter: event.target.value })} />

          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando aparência..." : "Salvar aparência"}
          </button>
        </section>

        <section className={adminTab === "agenda" || adminTab === "dashboard" ? "card" : "hiddenPanel"}>
          <h2>Agenda confirmada</h2>
          {appointments.length === 0 && <p className="hint">Ainda não há agendamentos confirmados.</p>}

          {appointments.map((appointment) => (
            <div className="adminItem" key={appointment.id}>
              <strong>
                {formatDate(appointment.date)} - {appointment.time}
              </strong>
              <p>
                {appointment.clientName} com {appointment.professional}
              </p>
              <p>
                {appointment.services} - {appointment.duration} min
              </p>
              <p>
                {money(appointment.total)} - {appointment.paid ? "Pago" : "Pagamento pendente"}
              </p>
              {appointment.rescheduleRequested && (
                <p className="rescheduleNotice">Remarcação solicitada</p>
              )}

              <div className="appointmentActions">
                {!appointment.paid && (
                  <button type="button" onClick={() => confirmAppointmentPayment(appointment.id)}>
                    Confirmar pagamento
                  </button>
                )}
                <button type="button" onClick={() => rescheduleAppointment(appointment.id)}>
                  {appointment.rescheduleRequested ? "Remarcação marcada" : "Remarcar"}
                </button>
                <button type="button" className="dangerAction" onClick={() => cancelAppointment(appointment.id)}>
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </section>

        <section className={adminTab === "agenda" || adminTab === "dashboard" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Lista de espera</h2>
            <span>{waitlist.length} pedidos</span>
          </div>

          {!waitlistAvailable && (
            <p className="hint">Libere e ative a lista de espera na aba Melhorias.</p>
          )}

          {waitlist.length === 0 && <p className="hint">Nenhum cliente aguardando encaixe.</p>}

          {waitlist.map((item) => (
            <div className="adminItem waitlistItem" key={item.id}>
              <strong>
                {item.clientName} - {formatDate(item.date)}
              </strong>
              <p>{item.services}</p>
              <p>WhatsApp: {item.whatsapp}</p>
              <p>Status: {item.status === "contacted" ? "Contatado" : "Aguardando contato"}</p>

              <div className="appointmentActions">
                <button type="button"
                  onClick={() =>
                    updateWaitlistStatus(
                      item.id,
                      item.status === "contacted" ? "waiting" : "contacted"
                    )
                  }
                >
                  {item.status === "contacted" ? "Marcar como aguardando" : "Marcar como contatado"}
                </button>
                <a
                  className="whatsappAction"
                  href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
                    `Cliente na lista de espera: ${item.clientName} | WhatsApp: ${item.whatsapp} | Data: ${formatDate(item.date)} | Serviço: ${item.services}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Enviar para WhatsApp
                </a>
                <button type="button" className="dangerAction" onClick={() => updateWaitlistStatus(item.id, "removed")}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (screen === "success") {
    return withNotice(
      <main className="app">
        <section className="card success">
          <div className="badge">Agendado</div>
          <h1>{repairText(business.successTitle)}</h1>
          <p>{repairText(business.successMessage)}</p>
          <p>Te esperamos na {repairText(business.name)}.</p>
          {business.address && <p>{repairText(business.address)}</p>}
          {confirmationSent ? (
            <p>{repairText(business.successFooter)}</p>
          ) : (
            <p>A confirmação está pronta para ser enviada à barbearia.</p>
          )}
          <p>
            <strong>
              {formatDate(selectedDate)} às {selectedTime}
            </strong>{" "}
            - {servicesText}
          </p>
          <p>Profissional: {professional}</p>
          <p className="hint">
            Em caso de cancelamento ou reagendamento, entre em contato com a barbearia.
          </p>
          {!confirmationSent && barberConfirmationMessage && (
            <a
              className="black linkButton"
              href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
                barberConfirmationMessage
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Enviar confirmação para a barbearia
            </a>
          )}
          <a
            className={confirmationSent ? "black linkButton" : "outline linkButton"}
            href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
              `Olá! Preciso falar sobre meu agendamento para ${formatDateForMessage(selectedDate)} às ${selectedTime}`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a barbearia
          </a>
          <button type="button" className="outline" onClick={startNewSchedule}>
            Novo agendamento
          </button>
        </section>
      </main>
    );
  }

  if (screen === "confirm") {
    return withNotice(
      <main className="app checkoutApp">
        <section className="checkoutHeader">
          <div className="stepper">
            <span>1 Serviços</span>
            <span>2 Horário</span>
            <span className="activeStep">3 Pagamento</span>
          </div>

          <p className="muted">Etapa final</p>
          <h1>Confirmar agendamento</h1>
          <p className="heroText">Revise os dados, escolha o pagamento e confirme seu horário.</p>
        </section>

        <section className="card summaryCard">
          <h2>Resumo</h2>
          <p>
            <strong>Cliente:</strong> {clientName}
          </p>
          <p>
            <strong>WhatsApp:</strong> {whatsapp}
          </p>
          <p>
            <strong>Profissional:</strong> {professional}
          </p>
          <p>
            <strong>Data:</strong> {formatDate(selectedDate)}
          </p>
          <p>
            <strong>Horário:</strong> {selectedTime}
          </p>
          <p>
            <strong>Tempo:</strong> {totalDuration} min
          </p>
          <h3>Serviços</h3>
          {chosenServices.map((service) => (
            <p key={service.name}>{service.name}</p>
          ))}
          <div className="priceBreakdown">
            <div className="summaryLine">
              <span>Subtotal</span>
              <strong>{money(totalPrice)}</strong>
            </div>

            {promotionAvailable && promotionValue > 0 && (
              <div className="summaryLine promoLine">
                <span>{business.promotionTitle || "Promoção"}</span>
                <strong>-{money(promotionValue)}</strong>
              </div>
            )}

            <div className="summaryLine finalPriceLine">
              <span>{promotionValue > 0 ? "Total com desconto online" : "Total"}</span>
              <strong>{money(promotionalTotal)}</strong>
            </div>
          </div>
        </section>

        <section className="card paymentCard">
          <h2>Pagamento</h2>

          {pixAvailable && (
            <button type="button"
              className={payment === "pix" ? "paymentOption selected" : "paymentOption"}
              onClick={() => setPayment("pix")}
            >
              <span>
                <strong>PIX antecipado</strong>
                <small>Total no PIX: {money(pixPrice)}</small>
                {pixDiscountValue > 0 && (
                  <small>
                    Desconto PIX: -{money(pixDiscountValue)} ({pixDiscount}%)
                  </small>
                )}
              </span>
              <span className="serviceCheck">{payment === "pix" ? "✓" : "+"}</span>
            </button>
          )}

          <button type="button"
            className={payment === "local" ? "paymentOption selected" : "paymentOption"}
            onClick={() => setPayment("local")}
          >
            <span>
              <strong>Pagar no local</strong>
              <small>
                {promotionAvailable && promotionValue > 0
                  ? `Total no atendimento: ${money(promotionalTotal)}`
                  : `Total no atendimento: ${money(totalPrice)}`}
              </small>
            </span>
            <span className="serviceCheck">{payment === "local" ? "✓" : "+"}</span>
          </button>

          {payment === "pix" && (
            <div className="pixBox">
              <strong>PIX com QR Code</strong>
              <div className="fakeQr" />
              <p>
                <strong>Chave PIX:</strong> {business.pixKey}
              </p>
              <button type="button" className="black" onClick={() => copyText(business.pixKey)}>
                Copiar chave PIX
              </button>
            </div>
          )}
        </section>

        <section className="checkoutActions">
          {payment === "pix" && pixDiscountValue > 0 && (
            <div className="summaryLine pixLine">
              <span>Desconto PIX</span>
              <strong>-{money(pixDiscountValue)}</strong>
            </div>
          )}
          <div className="summaryLine">
            <span>Total a pagar</span>
            <strong>{money(selectedPaymentTotal)}</strong>
          </div>
          <button type="button"
            className="confirmButton"
            disabled={cloudSaving === "appointment"}
            onClick={finishSchedule}
          >
            {cloudSaving === "appointment" ? "Reservando horário..." : "Confirmar agendamento"}
          </button>
          <button type="button" className="outline" onClick={() => setScreen("home")}>
            Voltar
          </button>

          <p className="helpText">
            Precisa de ajuda?{" "}
            <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">
              Falar com a barbearia
            </a>
          </p>
        </section>
      </main>
    );
  }

  if (scheduleBlocked) {
    return withNotice(
      <main className="app">
        <section className="appHeader">
          <div className="brand">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <span>Agendamento online</span>
              <h1>{business.name}</h1>
            </div>
          </div>
        </section>

        <section className="card blockedSchedule">
          <div className="blockedIcon">!</div>
          <h1>Agenda temporariamente indisponível</h1>
          <p>
            No momento, os agendamentos online desta barbearia estão pausados.
          </p>
          <p>
            Para marcar, cancelar ou remarcar um horário, fale diretamente com a barbearia.
          </p>

          <a
            className="black linkButton"
            href={`https://wa.me/${business.whatsapp}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a barbearia
          </a>

        </section>
      </main>
    );
  }

  return withNotice(
    <main className="app">
      <header className="appHeader">
        <div className="brand">
          <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
            {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
          </div>
          <div>
            <span>Agendamento online</span>
            <h1>{business.name}</h1>
          </div>
        </div>

        <div className="clientHeaderActions">
          <a className="miniWhatsapp" href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
          <button type="button" className="ownerLoginButton" onClick={openAdminArea}>
            Entrar
          </button>
        </div>
      </header>

      <section className="heroPanel">
        <div>
          <span>Agendamento online</span>
          <strong>Escolha seu atendimento</strong>
        </div>
        <p>Informe seus dados, escolha os serviços e receba uma sugestão de horário ideal.</p>
      </section>

      <section className="addressCard">
        <div>
          <span>Endereço</span>
          <strong>{business.address}</strong>
        </div>
        <a href={business.mapsUrl} target="_blank" rel="noreferrer">
          Como chegar
        </a>
      </section>

      <section className="portfolio">
        <div>
          <span>Antes</span>
        </div>
        <div>
          <span>Processo</span>
        </div>
        <div>
          <span>Final</span>
        </div>
      </section>

      <section className="stepper">
        <span className={selectedServices.length === 0 ? "activeStep" : ""}>1 Serviços</span>
        <span className={selectedServices.length > 0 && selectedTime === "" ? "activeStep" : ""}>
          2 Horário
        </span>
        <span>3 Pagamento</span>
      </section>

      <section className="card">
        <h2>Seus dados</h2>
        <label>WhatsApp</label>
        <input
          inputMode="numeric"
          placeholder="(51) 99999-9999"
          value={whatsapp}
          onChange={(event) => setWhatsapp(formatPhone(event.target.value))}
        />

        {history && (
          <div className="knownClient">
            <strong>Olá, {history.name}</strong>
            <p>
              Último atendimento:{" "}
              {history.lastServiceText ||
                history.lastServices.map((index) => services[index]?.name).join(" + ")}
              .
            </p>
            <button type="button" className="black" onClick={repeatLastService}>
              Agendar novamente
            </button>
          </div>
        )}

        <label>Nome do cliente</label>
        <input
          placeholder="Digite seu nome"
          value={clientName}
          onChange={(event) => setClientName(event.target.value)}
        />
      </section>

      <section className="card">
        <div className="sectionTitle">
          <h2>Serviços</h2>
          <span>Selecione um ou mais</span>
        </div>

        {activeServices.map((service) => (
          <button type="button"
            key={service.originalIndex}
            className={selectedServices.includes(service.originalIndex) ? "service selected" : "service"}
            onClick={() => toggleService(service.originalIndex)}
          >
            <span>
              <strong>{service.name}</strong>
              <small>
                {service.duration} min - {money(service.price)}
              </small>
            </span>
            <span className="serviceCheck">
              {selectedServices.includes(service.originalIndex) ? "✓" : "+"}
            </span>
          </button>
        ))}
      </section>

      {promotionAvailable && promotionValue > 0 && (
        <section className="promoBanner">
          <div>
            <span>{business.promotionTitle || "Promoção ativa"}</span>
            <strong>Você economiza {money(promotionValue)}</strong>
            <small>{business.promotionDescription}</small>
          </div>
          <b>{promotionDiscount}%</b>
        </section>
      )}

      {selectedServices.length > 0 && (
        <section className="recommendBox bestTimePanel">
          <span>Melhor opção para os serviços escolhidos</span>
          <strong>{recommendedTime || "Agenda cheia"}</strong>
          <small>
            Sugestão calculada para {totalDuration || schedule.slotInterval} min de atendimento.
          </small>
        </section>
      )}

      {showProfessionalChoice && (
        <section className="card">
          <div className="sectionTitle">
            <h2>Profissional</h2>
            <span>Opcional</span>
          </div>

          <div className="chips">
            {clientProfessionals.map((item) => (
              <button type="button"
                key={item.name}
                className={professional === item.name ? "chip activeChip" : "chip"}
                onClick={() => {
                  setProfessional(item.name);
                  setSelectedTime("");
                }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card">
        <div className="sectionTitle">
          <h2>Agenda</h2>
          <span>Horários inteligentes</span>
        </div>
        <p className="hint">A agenda considera funcionamento, pausas, bloqueios e horários ocupados.</p>

        <div className="rangeTabs">
          <button type="button" className={range === "today" ? "selected" : ""} onClick={() => setRange("today")}>
            Hoje
          </button>
          <button type="button" className={range === "week" ? "selected" : ""} onClick={() => setRange("week")}>
            Semana
          </button>
          <button type="button" className={range === "twoMonths" ? "selected" : ""} onClick={() => setRange("twoMonths")}>
            2 meses
          </button>
        </div>

        <div className="dateGrid">
          {dateOptions.map((dateText) => {
            const dateInfo = dateParts(dateText);
            const availability = getDateAvailability(dateText);

            return (
              <button type="button"
                key={dateText}
                className={[
                  "dateCard",
                  selectedDate === dateText ? "selected" : "",
                  !availability.available ? "closedDate" : "",
                ].join(" ")}
                onClick={() => {
                  setSelectedDate(dateText);
                  setSelectedTime("");
                }}
              >
                <span>{dateInfo.weekday}</span>
                <strong>{dateInfo.day}</strong>
                <small>{dateInfo.month}</small>
                <em>{availability.label}</em>
              </button>
            );
          })}
        </div>

        {hasChosenService && (
          <div className="scheduleLegend">
            <span>
              <i className="dot greenDot" />
              Livre
            </span>
            <span>
              <i className="dot grayDot" />
              Ocupado
            </span>
            <span>
              <i className="dot yellowDot" />
              Pausa
            </span>
          </div>
        )}

        <div className="sectionTitle compactTitle">
          <h2>Horários</h2>
          <span>{formatDate(selectedDate)}</span>
        </div>

        {!hasChosenService ? (
          <div className="emptySchedule">
            <strong>Escolha um serviço para ver os horários.</strong>
            <p>Os horários são calculados conforme o tempo total do atendimento.</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="emptySchedule">
            <strong>Fechado nesta data</strong>
            <p>Escolha outro dia ou ajuste a agenda no painel.</p>
            {waitlistAvailable && selectedServices.length > 0 && (
              <button type="button" className="black" onClick={joinWaitlist}>
                {waitlistSent ? "Você já está na lista de espera" : "Entrar na lista de espera"}
              </button>
            )}
          </div>
        ) : (
          <div className="timeGrid">
            {slots.map((slot) => (
              <button type="button"
                key={slot.time}
                className={[
                  "timeSlot",
                  slot.status,
                  selectedTime === slot.time ? "selected" : "",
                  !slot.available ? "disabledSlot" : "",
                ].join(" ")}
                disabled={!slot.available}
                onClick={() => setSelectedTime(slot.time)}
              >
                <strong>{slot.time}</strong>
                <small>{slot.label}</small>
              </button>
            ))}
          </div>
        )}

        {slots.length > 0 && !slots.some((slot) => slot.available) && waitlistAvailable && (
          <div className="waitlistBox">
            <strong>Nenhum horário livre neste dia</strong>
            <p>Entre na lista de espera para a barbearia te chamar quando abrir um encaixe.</p>
            <button type="button" className="black" onClick={joinWaitlist}>
              {waitlistSent ? "Você já está na lista de espera" : "Entrar na lista de espera"}
            </button>
          </div>
        )}
      </section>

      <section className="bottomBar">
        <div className="bottomTitle">Resumo do agendamento</div>
        <div className="summaryLine">
          <span>Data</span>
          <strong>{formatDate(selectedDate)}</strong>
        </div>
        <div className="summaryLine">
          <span>Tempo</span>
          <strong>{hasChosenService ? `${totalDuration} min` : "Selecione"}</strong>
        </div>
        {promotionAvailable && promotionValue > 0 && (
          <div className="summaryLine promoLine">
            <span>Promoção</span>
            <strong>-{money(promotionValue)}</strong>
          </div>
        )}
        <div className="summaryLine">
          <span>Total</span>
          <strong className="bottomTotal">{hasChosenService ? money(promotionalTotal) : "A definir"}</strong>
        </div>
        <button type="button" className={canContinue ? "green" : "green disabled"} onClick={goCheckout}>
          {hasChosenService ? "Continuar →" : "Escolha um serviço"}
        </button>
      </section>
    </main>
  );
}

function proSlug(){const p=window.location.pathname.split("/").filter(Boolean);return p[p.indexOf("painel")+1]||p[p.indexOf("agendamento")+1]||"master-barbearia";}
function proClient(){return window.location.pathname.includes("/agendamento/");}
function todayIsoPro(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function promoOk(s){const t=todayIsoPro();return !!s.pro_promotions_enabled&&!!s.promotion_active&&(!s.promotion_start_date||t>=s.promotion_start_date)&&(!s.promotion_end_date||t<=s.promotion_end_date);}
function directImage(url){const u=String(url||"").trim();return u&&(u.startsWith("http://")||u.startsWith("https://"))?u:"";}
function AppProFeatures(){
 const slug=proSlug();
 const[ctx,setCtx]=useState({tab:"",admin:false});
 const[bg,setBg]=useState({client_background_url:"",admin_background_url:"",client_background_opacity:.18,admin_background_opacity:.12});
 const[media,setMedia]=useState({before_image_url:"",process_image_url:"",final_image_url:"",before_image_label:"Antes",process_image_label:"Processo",final_image_label:"Finalizado"});
 const[services,setServices]=useState([]);
 const[growth,setGrowth]=useState({pro_service_delete_enabled:true,pro_backplate_enabled:false,pro_appearance_media_enabled:false,pro_promotions_enabled:false,pro_loyalty_enabled:false,pro_waitlist_enabled:false,pro_instagram_enabled:false,pro_google_client_enabled:false,promotion_active:false,promotion_title:"Promoção online",promotion_description:"",promotion_discount:10,promotion_start_date:"",promotion_end_date:"",loyalty_enabled:false,loyalty_reward_description:"",loyalty_visit_goal:5,loyalty_discount:20,instagram_url:"",google_client_login_enabled:false});
 const[waitlist,setWaitlist]=useState([]);const[clients,setClients]=useState([]);const[saving,setSaving]=useState("");const[msg,setMsg]=useState("");
 useEffect(()=>{const tick=()=>setCtx({tab:window.__agendaProAdminTab||"",admin:window.__agendaProViewMode==="admin"&&window.__agendaProAdminLoggedIn===true});tick();const id=setInterval(tick,400);return()=>clearInterval(id);},[]);
 function goTab(target){try{window.__agendaProAdminTab=target;const labels={services:"Serviços",appearance:"Aparência",improvements:"Melhorias"};const button=[...document.querySelectorAll("button")].find((b)=>(b.textContent||"").trim().toLowerCase()===String(labels[target]||target).toLowerCase());if(button)button.click();window.scrollTo({top:0,behavior:"smooth"});}catch(_e){}}
 async function loadPro(){
  const columns="logo_url,theme_color,client_background_url,admin_background_url,client_background_opacity,admin_background_opacity,before_image_url,process_image_url,final_image_url,before_image_label,process_image_label,final_image_label,pro_service_delete_enabled,pro_backplate_enabled,pro_appearance_media_enabled,pro_promotions_enabled,pro_loyalty_enabled,pro_waitlist_enabled,pro_instagram_enabled,pro_google_client_enabled,promotion_active,promotion_title,promotion_description,promotion_discount,promotion_start_date,promotion_end_date,loyalty_enabled,loyalty_reward_description,loyalty_visit_goal,loyalty_discount,instagram_url,google_client_login_enabled";
  const shopReq=supabase.from("barbershops").select(columns).eq("slug",slug).single();
  const servReq=supabase.from("services").select("id,name,price,duration,deleted_at").is("deleted_at",null).order("sort_order",{ascending:true});
  const waitReq=supabase.rpc("get_admin_waitlist",{target_slug:slug});
  const cliReq=supabase.rpc("get_loyalty_clients",{target_slug:slug});
  const r=await Promise.allSettled([shopReq,servReq,waitReq,cliReq]);const shop=r[0].value?.data;const rows=r[1].value?.data;const w=r[2].value?.data;const c=r[3].value?.data;
  if(shop){setBg({client_background_url:shop.client_background_url||"",admin_background_url:shop.admin_background_url||"",client_background_opacity:shop.client_background_opacity||.18,admin_background_opacity:shop.admin_background_opacity||.12});setMedia({logo_url:shop.logo_url||"",before_image_url:shop.before_image_url||"",process_image_url:shop.process_image_url||"",final_image_url:shop.final_image_url||"",before_image_label:shop.before_image_label||"Antes",process_image_label:shop.process_image_label||"Processo",final_image_label:shop.final_image_label||"Finalizado"});setGrowth(g=>({...g,...shop}));}
  setServices((rows||[]).filter(x=>x.name));setWaitlist(w||[]);setClients(c||[]);
 }
 useEffect(()=>{loadPro();},[slug]);
 useEffect(()=>{let layer=document.getElementById("agendaProBackgroundLayer");if(!layer){layer=document.createElement("div");layer.id="agendaProBackgroundLayer";Object.assign(layer.style,{position:"fixed",inset:"0",zIndex:"0",pointerEvents:"none",backgroundSize:"cover",backgroundPosition:"center"});document.body.prepend(layer);document.body.style.position="relative";}const url=growth.pro_backplate_enabled?(ctx.admin?bg.admin_background_url:bg.client_background_url):"";const op=Number(ctx.admin?bg.admin_background_opacity:bg.client_background_opacity)||0;if(!directImage(url)){layer.style.opacity="0";layer.style.backgroundImage="none";return;}layer.style.opacity=String(Math.max(0,Math.min(op,.7)));layer.style.backgroundImage="linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url('"+String(url).replace(/'/g,"%27")+"')";},[bg,growth.pro_backplate_enabled,ctx.admin]);
 async function del(s){if(!window.confirm('Excluir o serviço "'+s.name+'"? O histórico antigo será mantido.'))return;setSaving('d'+s.id);setMsg("");try{const{error}=await supabase.rpc("soft_delete_service_by_name",{target_slug:slug,service_name_input:s.name});if(error)throw error;setServices(a=>a.filter(x=>x.id!==s.id));setMsg("Serviço excluído com segurança.");}catch(e){setMsg(e?.message||"Não foi possível excluir o serviço.");}finally{setSaving("");}}
 async function saveBg(){setSaving("bg");setMsg("");try{const{error}=await supabase.rpc("save_background_settings",{target_slug:slug,client_background_url_input:bg.client_background_url||"",admin_background_url_input:bg.admin_background_url||"",client_background_opacity_input:Number(bg.client_background_opacity||.18),admin_background_opacity_input:Number(bg.admin_background_opacity||.12)});if(error)throw error;setMsg("Backplate salvo.");await loadPro();}catch(e){setMsg(e?.message||"Não foi possível salvar o backplate.");}finally{setSaving("");}}
 async function saveMedia(){setSaving("media");setMsg("");try{const{error}=await supabase.rpc("save_appearance_media",{target_slug:slug,before_image_url_input:media.before_image_url||"",process_image_url_input:media.process_image_url||"",final_image_url_input:media.final_image_url||"",before_image_label_input:media.before_image_label||"Antes",process_image_label_input:media.process_image_label||"Processo",final_image_label_input:media.final_image_label||"Finalizado"});if(error)throw error;setMsg("Fotos Antes, Processo e Finalizado salvas.");await loadPro();}catch(e){setMsg(e?.message||"Não foi possível salvar as fotos.");}finally{setSaving("");}}
 async function saveGrowth(){setSaving("growth");setMsg("");try{const{error}=await supabase.from("barbershops").update({promotion_active:!!growth.promotion_active,promotion_title:growth.promotion_title||"Promoção online",promotion_description:growth.promotion_description||"",promotion_discount:Number(growth.promotion_discount||0),promotion_start_date:growth.promotion_start_date||null,promotion_end_date:growth.promotion_end_date||null,loyalty_enabled:!!growth.loyalty_enabled,loyalty_reward_description:growth.loyalty_reward_description||"",loyalty_visit_goal:Number(growth.loyalty_visit_goal||5),loyalty_discount:Number(growth.loyalty_discount||0),instagram_url:growth.instagram_url||null,google_client_login_enabled:!!growth.google_client_login_enabled}).eq("slug",slug);if(error)throw error;setMsg("Configurações salvas. A liberação dos módulos PRO continua no Painel Plataforma.");await loadPro();}catch(e){setMsg(e?.message||"Não foi possível salvar as configurações.");}finally{setSaving("");}}
 const imgs=[['before_image_url','before_image_label'],['process_image_url','process_image_label'],['final_image_url','final_image_label']].map(([u,l])=>({url:directImage(media[u]),label:media[l]})).filter(x=>x.url);
 if(proClient()){const show=promoOk(growth);return <>{growth.pro_appearance_media_enabled&&imgs.length?<section className="portfolio proImageGallery">{imgs.map((i,idx)=><div key={idx} style={{backgroundImage:'linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.56)), url('+i.url+')'}}><span>{i.label}</span></div>)}</section>:null}{(show||(growth.pro_loyalty_enabled&&growth.loyalty_enabled)||(growth.pro_instagram_enabled&&growth.instagram_url)||(growth.pro_google_client_enabled&&growth.google_client_login_enabled))?<section className="safeFeatureClientBanner">{show?<div><strong>{growth.promotion_title}</strong><p>{growth.promotion_description}</p>{Number(growth.promotion_discount)>0?<span>{growth.promotion_discount}% de desconto</span>:null}</div>:null}{growth.pro_loyalty_enabled&&growth.loyalty_enabled?<p>Fidelidade: {growth.loyalty_reward_description}</p>:null}<div className="safeFeatureActions">{growth.pro_instagram_enabled&&growth.instagram_url?<a href={growth.instagram_url} target="_blank" rel="noreferrer">Abrir Instagram</a>:null}{growth.pro_google_client_enabled&&growth.google_client_login_enabled?<span>Login Google do cliente ativo</span>:null}</div></section>:null}</>}
 if(!ctx.admin)return null;
 if(ctx.tab==="services")return null;
 if(ctx.tab==="appearance")return <section className="safeFeaturePanel appearancePremium"><div className="safeFeatureHeader"><div><span>Aparência</span><h2>Aparência premium da barbearia</h2><p>Personalize logo, cor, fundos e fotos do cliente com prévia antes de salvar.</p></div><a href={'/agendamento/'+slug}>Ver tela do cliente</a></div>{msg?<div className="safeFeatureNotice">{msg}</div>:null}<div className="appearancePremiumGrid"><div className="safeFeatureCard appearanceBrandCard"><h3>Identidade da barbearia</h3><label>Logo da barbearia</label><input value={media.logo_url||""} onChange={e=>setMedia(m=>({...m,logo_url:e.target.value}))} placeholder="https://site.com/logo.png"/><div className="logoPreview">{directImage(media.logo_url)?<img src={media.logo_url} alt="Logo da barbearia"/>:<span>Logo</span>}</div><label>Cor principal</label><input type="color" value={growth.theme_color||"#22c55e"} onChange={e=>setGrowth(g=>({...g,theme_color:e.target.value}))}/><p className="fieldHint">A cor principal ajuda a deixar o painel com a identidade da barbearia.</p></div>{growth.pro_backplate_enabled?<div className="safeFeatureCard"><h3>Planos de fundo</h3><label>Imagem de fundo do cliente</label><input value={bg.client_background_url} onChange={e=>setBg(b=>({...b,client_background_url:e.target.value}))} placeholder="https://site.com/fundo-cliente.jpg"/>{directImage(bg.client_background_url)?<div className="imagePreview" style={{backgroundImage:'url('+bg.client_background_url+')'}}><button type="button" onClick={()=>setBg(b=>({...b,client_background_url:""}))}>Limpar</button></div>:<p className="fieldHint">Use link direto .jpg, .png ou .webp.</p>}<label>Opacidade cliente</label><input type="number" min="0" max="0.7" step="0.05" value={bg.client_background_opacity} onChange={e=>setBg(b=>({...b,client_background_opacity:e.target.value}))}/><label>Imagem de fundo do painel</label><input value={bg.admin_background_url} onChange={e=>setBg(b=>({...b,admin_background_url:e.target.value}))} placeholder="https://site.com/fundo-painel.jpg"/>{directImage(bg.admin_background_url)?<div className="imagePreview" style={{backgroundImage:'url('+bg.admin_background_url+')'}}><button type="button" onClick={()=>setBg(b=>({...b,admin_background_url:""}))}>Limpar</button></div>:null}<label>Opacidade painel</label><input type="number" min="0" max="0.7" step="0.05" value={bg.admin_background_opacity} onChange={e=>setBg(b=>({...b,admin_background_opacity:e.target.value}))}/></div>:<div className="safeFeatureCard"><h3>Backplate desativado</h3><p>Ative em Melhorias para liberar os fundos do cliente e do painel.</p></div>}{growth.pro_appearance_media_enabled?<div className="safeFeatureCard appearancePhotos"><h3>Fotos Antes / Processo / Finalizado</h3>{[['before_image_url','before_image_label','Antes'],['process_image_url','process_image_label','Processo'],['final_image_url','final_image_label','Finalizado']].map(([urlKey,labelKey,title])=><div className="photoConfig" key={urlKey}><label>Foto {title}</label><input value={media[urlKey]||""} onChange={e=>setMedia(m=>({...m,[urlKey]:e.target.value}))} placeholder={'https://site.com/'+String(title).toLowerCase()+'.jpg'}/>{directImage(media[urlKey])?<div className="imagePreview photoPreview" style={{backgroundImage:'url('+media[urlKey]+')'}}><button type="button" onClick={()=>setMedia(m=>({...m,[urlKey]:""}))}>Limpar</button></div>:<div className="emptyPreview">Prévia da imagem</div>}<label>Legenda {title}</label><input value={media[labelKey]||title} onChange={e=>setMedia(m=>({...m,[labelKey]:e.target.value}))}/></div>)}</div>:<div className="safeFeatureCard"><h3>Fotos do cliente desativadas</h3><p>Ative em Melhorias para liberar as fotos Antes, Processo e Finalizado.</p></div>}<div className="safeFeatureCard clientScreenPreview"><h3>Prévia da tela do cliente</h3><div className="phonePreview" style={{borderColor:growth.theme_color||"#22c55e"}}>{directImage(bg.client_background_url)?<div className="phoneBg" style={{backgroundImage:'linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.78)), url('+bg.client_background_url+')'}}/>:null}<div className="phoneContent">{directImage(media.logo_url)?<img src={media.logo_url} alt="Logo"/>:<div className="phoneLogo">Logo</div>}<strong>Agende seu horário</strong><small>Escolha serviço, profissional e horário disponível.</small><div className="phoneButton" style={{background:growth.theme_color||"#22c55e"}}>Continuar</div>{growth.pro_appearance_media_enabled&&imgs.length?<div className="miniGallery">{imgs.slice(0,3).map((i,idx)=><span key={idx} style={{backgroundImage:'url('+i.url+')'}}>{i.label}</span>)}</div>:null}</div></div></div><div className="safeFeatureCard appearanceActions"><h3>Salvar aparência</h3><p>Salva logo, cor principal, fundos e fotos em uma única ação.</p><button type="button" disabled={saving==='premiumAppearance'} onClick={async()=>{setSaving('premiumAppearance');setMsg('');try{const{error}=await supabase.rpc('save_premium_appearance',{target_slug:slug,logo_url_input:media.logo_url||'',theme_color_input:growth.theme_color||'#22c55e',client_background_url_input:bg.client_background_url||'',admin_background_url_input:bg.admin_background_url||'',client_background_opacity_input:Number(bg.client_background_opacity||.18),admin_background_opacity_input:Number(bg.admin_background_opacity||.12),before_image_url_input:media.before_image_url||'',process_image_url_input:media.process_image_url||'',final_image_url_input:media.final_image_url||'',before_image_label_input:media.before_image_label||'Antes',process_image_label_input:media.process_image_label||'Processo',final_image_label_input:media.final_image_label||'Finalizado'});if(error)throw error;setMsg('Aparência premium salva.');await loadPro();}catch(e){setMsg(e?.message||'Não foi possível salvar a aparência.');}finally{setSaving('');}}}>{saving==='premiumAppearance'?'Salvando...':'Salvar aparência'}</button><button type="button" className="secondaryModuleButton" onClick={()=>window.open('/agendamento/'+slug,'_blank')}>Ver tela do cliente</button></div></div></section>;
 if(ctx.tab==="improvements"){const modules=[{group:"Serviços",items:[{key:"pro_service_delete_enabled",title:"Excluir serviço seguro",desc:"Permite remover um serviço da vitrine sem apagar agendamentos antigos.",tab:"services",depends:"Precisa existir pelo menos um serviço cadastrado."}]},{group:"Aparência",items:[{key:"pro_backplate_enabled",title:"Backplate",desc:"Libera plano de fundo personalizado para cliente e painel.",tab:"appearance",depends:"Usa link direto de imagem .jpg, .png ou .webp."},{key:"pro_appearance_media_enabled",title:"Fotos Antes / Processo / Finalizado",desc:"Mostra três fotos no painel do cliente, com legenda opcional.",tab:"appearance",depends:"Precisa cadastrar os links das imagens na aba Aparência."}]},{group:"Marketing",items:[{key:"pro_promotions_enabled",title:"Promoções",desc:"Exibe promoção ativa no painel do cliente.",tab:"improvements",depends:"Também marque Promoção ativa e salve o texto/desconto."},{key:"pro_instagram_enabled",title:"Instagram",desc:"Mostra botão direto para o Instagram da barbearia.",tab:"improvements",depends:"Informe o link do Instagram abaixo."}]},{group:"Clientes",items:[{key:"pro_loyalty_enabled",title:"Fidelidade",desc:"Libera controle de pontos, visitas e recompensa para clientes.",tab:"improvements",depends:"Também ative Fidelidade e salve a recompensa."},{key:"pro_waitlist_enabled",title:"Lista de espera",desc:"Permite acompanhar clientes aguardando horário.",tab:"improvements",depends:"Depende de clientes entrarem na lista de espera."},{key:"pro_google_client_enabled",title:"Login Google cliente",desc:"Libera identificação do cliente com conta Google.",tab:"improvements",depends:"Também marque Login Google do cliente."}]}];return <section className="safeFeaturePanel improvementsCenter"><div className="safeFeatureHeader"><div><span>Melhorias</span><h2>Central de módulos PRO</h2><p>Os módulos são liberados no Painel Plataforma. A barbearia configura apenas o que já estiver liberado.</p></div></div>{msg?<div className="safeFeatureNotice">{msg}</div>:null}<div className="improvementGroups">{modules.map((group)=><div className="improvementGroup" key={group.group}><h3>{group.group}</h3>{group.items.map((item)=><article className={growth[item.key]?"improvementModule active":"improvementModule"} key={item.key}><div className="improvementTop"><span className="moduleStatus">{growth[item.key]?"Liberado":"Bloqueado"}</span><strong>{item.title}</strong></div><p>{item.desc}</p><small>{growth[item.key]?item.depends:"Este recurso ainda não foi liberado no Painel Plataforma."}</small><div className="moduleActions"><button type="button" className="secondaryModuleButton" disabled={!growth[item.key]} onClick={()=>goTab(item.tab)}>{growth[item.key]?"Configurar":"Aguardando liberação"}</button></div></article>)}</div>)}</div><div className="safeFeatureGrid"><div className="safeFeatureCard"><h3>Configuração de promoções</h3><label><input type="checkbox" disabled={!growth.pro_promotions_enabled} checked={!!growth.promotion_active} onChange={e=>setGrowth(g=>({...g,promotion_active:e.target.checked}))}/> Promoção ativa</label><input disabled={!growth.pro_promotions_enabled} value={growth.promotion_title||""} onChange={e=>setGrowth(g=>({...g,promotion_title:e.target.value}))} placeholder="Título da promoção"/><textarea disabled={!growth.pro_promotions_enabled} value={growth.promotion_description||""} onChange={e=>setGrowth(g=>({...g,promotion_description:e.target.value}))} placeholder="Descrição da promoção"/><input disabled={!growth.pro_promotions_enabled} type="number" value={growth.promotion_discount||0} onChange={e=>setGrowth(g=>({...g,promotion_discount:e.target.value}))} placeholder="Desconto %"/><button type="button" disabled={saving==='growth'||!growth.pro_promotions_enabled} onClick={saveGrowth}>{saving==='growth'?'Salvando...':'Salvar promoção'}</button></div><div className="safeFeatureCard"><h3>Configuração de fidelidade</h3><label><input type="checkbox" disabled={!growth.pro_loyalty_enabled} checked={!!growth.loyalty_enabled} onChange={e=>setGrowth(g=>({...g,loyalty_enabled:e.target.checked}))}/> Fidelidade ativa</label><textarea disabled={!growth.pro_loyalty_enabled} value={growth.loyalty_reward_description||""} onChange={e=>setGrowth(g=>({...g,loyalty_reward_description:e.target.value}))} placeholder="Recompensa do cliente"/><button type="button" disabled={saving==='growth'||!growth.pro_loyalty_enabled} onClick={saveGrowth}>{saving==='growth'?'Salvando...':'Salvar fidelidade'}</button>{growth.pro_loyalty_enabled?clients.slice(0,5).map(c=><article className="safeFeatureRow" key={c.id||c.whatsapp}><span><strong>{c.name}</strong><small>{c.visit_count||0} visitas · {c.loyalty_points||0} pontos</small></span></article>):null}</div>{growth.pro_waitlist_enabled?<div className="safeFeatureCard"><h3>Lista de espera</h3>{waitlist.length?waitlist.slice(0,8).map(w=><article className="safeFeatureRow" key={w.id}><span><strong>{w.client_name}</strong><small>{w.preferred_date||'Sem data'} · {w.service_text||'Serviço'}</small><small>{w.whatsapp}</small></span></article>):<p>Nenhum cliente aguardando.</p>}</div>:null}<div className="safeFeatureCard"><h3>Instagram e Google</h3><input disabled={!growth.pro_instagram_enabled} value={growth.instagram_url||""} onChange={e=>setGrowth(g=>({...g,instagram_url:e.target.value}))} placeholder="https://instagram.com/sua_barbearia"/><label><input type="checkbox" disabled={!growth.pro_google_client_enabled} checked={!!growth.google_client_login_enabled} onChange={e=>setGrowth(g=>({...g,google_client_login_enabled:e.target.checked}))}/> Login Google do cliente</label><button type="button" disabled={saving==='growth'||(!growth.pro_instagram_enabled&&!growth.pro_google_client_enabled)} onClick={saveGrowth}>{saving==='growth'?'Salvando...':'Salvar canais'}</button></div></div></section>}
 return null;
}
export default function App(){return <><CoreAgendaProApp/><AppProFeatures/></>;}