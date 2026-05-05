import React from "react";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import "./styles.css";

const supabaseUrl = "https://opcuaxkndslmejhuauyq.supabase.co";
const supabaseAnonKey = "sb_publishable_BdyBW7dYCg5qf4bBkRFdHQ_doLtqCsy";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const initialBusiness = {
  name: "Barbearia do João",
  logo: "B",
  logoImage: "",
  slug: "barbearia-do-joao",
  ownerEmail: "admin@barbeariadojoao.com",
  plan: "professional",
  monthlyStatus: "active",
  nextBillingDate: "2026-06-04",
  whatsapp: "5551996238323",
  address: "Rua Exemplo, 123 - Centro",
  mapsUrl: "https://maps.google.com/",
  themeColor: "#22c55e",
  themeColorSecondary: "#4ade80",
  pixEnabled: true,
  pixKey: "51996238323",
  pixDiscount: 10,
  automaticConfirmationEnabled: true,
  successTitle: "Agendamento confirmado!",
  successMessage: "Seu horário já está reservado.",
  successFooter: "A barbearia já recebeu os detalhes do atendimento.",
};

const initialAccessAccounts = [
  {
    id: "access-1",
    email: "admin@barbeariadojoao.com",
    role: "Dono",
    active: true,
    fixed: true,
  },
  {
    id: "access-2",
    email: "dyoser@app.com",
    role: "Plataforma",
    active: true,
    fixed: true,
  },
];

const initialServices = [
  { name: "Corte de cabelo", duration: 30, price: 35, active: true },
  { name: "Barba", duration: 20, price: 25, active: true },
  { name: "Sobrancelha", duration: 10, price: 15, active: true },
  { name: "Descoloração", duration: 90, price: 120, active: true },
  { name: "Coloração", duration: 70, price: 100, active: true },
];

const initialProfessionals = [
  { name: "Primeiro disponível", active: true, fixed: true },
  { name: "João", active: true, fixed: false },
  { name: "Pedro", active: true, fixed: false },
  { name: "Carlos", active: true, fixed: false },
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

const initialAppointments = [
  {
    id: "demo-1",
    clientName: "Cliente reservado",
    whatsapp: "51988887777",
    professional: "João",
    date: getDateAfterDays(0),
    time: "09:00",
    duration: 50,
    services: "Corte de cabelo + Barba",
    total: 60,
    payment: "local",
    paid: false,
    rescheduleRequested: false,
  },
  {
    id: "demo-2",
    clientName: "Cliente reservado",
    whatsapp: "51977776666",
    professional: "Pedro",
    date: getDateAfterDays(0),
    time: "10:30",
    duration: 30,
    services: "Corte de cabelo",
    total: 35,
    payment: "pix",
    paid: true,
    rescheduleRequested: false,
  },
];

const clientHistory = {
  "51999999999": {
    name: "Dyoser",
    lastServices: [0, 1],
    lastProfessional: "João",
  },
};

const adminTabs = [
  { id: "dashboard", label: "Painel" },
  { id: "agenda", label: "Agenda" },
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
    description: "Simula o envio automático dos dados para a barbearia.",
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
    description: "Cliente entra na fila quando não houver horário disponível.",
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
    title: "Login Google do cliente",
    description: "Histórico completo do cliente com conta Google.",
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
    description: "Cliente altera o próprio horário por link único.",
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
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function hexToRgba(hex, opacity) {
  const cleanHex = hex.replace("#", "");
  const red = parseInt(cleanHex.substring(0, 2), 16);
  const green = parseInt(cleanHex.substring(2, 4), 16);
  const blue = parseInt(cleanHex.substring(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

const storagePrefix = "agendaBarbeariaV1";

const storageKeys = {
  business: "business",
  accessAccounts: "accessAccounts",
  featureFlags: "featureFlags",
  services: "services",
  professionals: "professionals",
  schedule: "schedule",
  appointments: "appointments",
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

function readSavedData(key, fallback) {
  if (typeof window === "undefined") return fallback;

  try {
    const saved = window.localStorage.getItem(storageKey(key));
    if (!saved) return fallback;
    return mergeWithDefault(fallback, JSON.parse(saved));
  } catch {
    return fallback;
  }
}

function saveData(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    console.warn("Não foi possível salvar os dados no navegador.");
  }
}

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
  return parts.includes("painel") ? "adminLogin" : "client";
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || "")
  );
}

function mapBusinessFromCloud(row, account) {
  return mergeWithDefault(initialBusiness, {
    name: row.name,
    logo: row.logo_text || "B",
    logoImage: row.logo_url || "",
    slug: row.slug,
    ownerEmail: account?.owner_email || initialBusiness.ownerEmail,
    plan: account?.plan || initialBusiness.plan,
    monthlyStatus: account?.monthly_status || initialBusiness.monthlyStatus,
    nextBillingDate: account?.next_billing_date || initialBusiness.nextBillingDate,
    whatsapp: row.whatsapp,
    address: row.address || "",
    mapsUrl: row.maps_url || "",
    themeColor: row.theme_color || initialBusiness.themeColor,
    themeColorSecondary: row.theme_color_secondary || initialBusiness.themeColorSecondary,
    pixEnabled: Boolean(row.pix_enabled),
    pixKey: row.pix_key || "",
    pixDiscount: Number(row.pix_discount || 0),
    automaticConfirmationEnabled: Boolean(row.automatic_confirmation_enabled),
    successTitle: row.success_title || initialBusiness.successTitle,
    successMessage: row.success_message || initialBusiness.successMessage,
    successFooter: row.success_footer || initialBusiness.successFooter,
  });
}

function mapAccessAccountsFromCloud(rows, ownerEmail) {
  const cloudAccounts = (rows || []).map((item) => ({
    id: item.id,
    email: item.email,
    role: item.role === "owner" ? "Dono" : item.role === "platform" ? "Plataforma" : "Gerente",
    active: item.active !== false,
    fixed: item.role === "owner",
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

export default function App() {
  const [viewMode, setViewMode] = useState(() => initialViewModeFromUrl());
  const [adminTab, setAdminTab] = useState("dashboard");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminAccessCode, setAdminAccessCode] = useState("");
  const [adminLoginError, setAdminLoginError] = useState("");
  const [screen, setScreen] = useState("home");
  const [business, setBusiness] = useState(() =>
    readSavedData(storageKeys.business, initialBusiness)
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
  const [cloudStatus, setCloudStatus] = useState("Conectando ao Supabase...");
  const [cloudSaving, setCloudSaving] = useState("");
  const [cloudHistory, setCloudHistory] = useState(null);

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
    loadCloudData();
  }, []);

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

  const activeServices = services
    .map((service, index) => ({ ...service, originalIndex: index }))
    .filter((service) => service.active);

  const chosenServices = useMemo(
    () => services.filter((_, index) => selectedServices.includes(index)),
    [services, selectedServices]
  );

  const totalDuration = chosenServices.reduce((sum, service) => sum + service.duration, 0);
  const totalPrice = chosenServices.reduce((sum, service) => sum + service.price, 0);
  const pixPrice = totalPrice * (1 - business.pixDiscount / 100);
  const servicesText = chosenServices.map((service) => service.name).join(" + ");

  const dateCount = range === "today" ? 1 : range === "week" ? 7 : 60;
  const dateOptions = Array.from({ length: dateCount }, (_, index) => getDateAfterDays(index));

  const slots = buildSlotsForDate(selectedDate);
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
        setCloudStatus("Usando dados locais. Barbearia ainda não encontrada no Supabase.");
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
        supabase
          .from("appointments")
          .select("*")
          .eq("barbershop_id", businessData.id)
          .order("appointment_date", { ascending: true })
          .order("appointment_time", { ascending: true }),
        supabase.rpc("get_barbershop_accesses", {
          target_slug: businessData.slug,
        }),
        supabase.from("feature_flags").select("*").eq("barbershop_id", businessData.id),
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

      if (servicesResult.data?.length) {
        setServices(
          servicesResult.data.map((item) => ({
            id: item.id,
            name: item.name,
            duration: Number(item.duration),
            price: Number(item.price),
            active: Boolean(item.active),
          }))
        );
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
        const professionalById = {};
        (professionalsResult.data || []).forEach((item) => {
          professionalById[item.id] = item.fixed ? "Primeiro disponível" : item.name;
        });

        setAppointments(
          appointmentsResult.data.map((item) => ({
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
            rescheduleRequested: Boolean(item.reschedule_requested),
          }))
        );
      }

      setCloudStatus("Conectado ao Supabase");
    } catch (error) {
      console.error(error);
      setCloudStatus("Usando dados locais. Não foi possível conectar ao Supabase.");
    }
  }

  function realProfessionals() {
    return professionals
      .filter((item) => !item.fixed && item.name.trim() !== "" && item.active)
      .map((item) => item.name);
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

  function appointmentConflict(professionalName, dateText, startTime, duration) {
    return appointments.some((item) => {
      if (item.date !== dateText) return false;
      if (item.professional !== professionalName) return false;

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

  function professionalAvailable(professionalName, dateText, startTime, duration) {
    if (baseReason(dateText, startTime, duration)) return false;
    if (blockConflict(professionalName, dateText, startTime, duration)) return false;
    if (appointmentConflict(professionalName, dateText, startTime, duration)) return false;
    return true;
  }

  function findAvailableProfessional(dateText, startTime, duration) {
    return realProfessionals().find((item) =>
      professionalAvailable(item, dateText, startTime, duration)
    );
  }

  function buildSlotsForDate(dateText) {
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

        if (appointmentConflict(professional, dateText, time, duration)) {
          result.push({ time, status: "busy", label: "Ocupado", available: false });
          continue;
        }

        result.push({ time, status: "available", label: "Disponível", available: true, professional });
        continue;
      }

      const availableProfessional = findAvailableProfessional(dateText, time, duration);

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

    return { label: "Cheio", available: false };
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
      alert("A agenda online está temporariamente indisponível.");
      return;
    }

    if (!canContinue) {
      alert("Informe WhatsApp, nome, serviço e horário disponível.");
      return;
    }

    setScreen("confirm");
    window.scrollTo(0, 0);
  }

  async function finishSchedule() {
    if (!payment) {
      alert("Escolha a forma de pagamento.");
      return;
    }

    const freshSlot = buildSlotsForDate(selectedDate).find((slot) => slot.time === selectedTime);

    if (!freshSlot?.available) {
      alert("Esse horário acabou de ficar indisponível. Escolha outro horário.");
      setScreen("home");
      setSelectedTime("");
      return;
    }

    const finalProfessional =
      professional === "Primeiro disponível" ? freshSlot.professional : professional;

    const id = makeId("ag");
    const finalPayment = payment === "pix" ? "pix" : "local";
    const finalTotal = payment === "pix" ? pixPrice : totalPrice;

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
      rescheduleRequested: false,
    };

    console.log("Confirmação automática simulada:", {
      businessWhatsapp: business.whatsapp,
      ...appointmentData,
    });

    setAppointments((current) => current.concat(appointmentData));
    setConfirmedId(id);
    setProfessional(finalProfessional);
    setConfirmationSent(autoConfirmationFeatureEnabled && business.automaticConfirmationEnabled);
    setScreen("success");
    window.scrollTo(0, 0);

    saveAppointmentToCloud(appointmentData, finalProfessional);
  }

  async function saveAppointmentToCloud(appointmentData, finalProfessional) {
    if (!business.slug) return;

    const { data, error } = await supabase.rpc("book_appointment", {
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
      console.error("Erro ao salvar no Supabase:", error);
      setCloudStatus("Agendamento salvo localmente. Falhou ao enviar para o Supabase.");
      return;
    }

    setCloudStatus("Agendamento salvo no Supabase");

    if (data) {
      setConfirmedId(String(data));
      setAppointments((current) =>
        current.map((item) =>
          item.id === appointmentData.id ? { ...item, id: String(data) } : item
        )
      );
    }
  }

  async function runCloudSave(kind, successMessage, action) {
    setCloudSaving(kind);
    setCloudStatus("Salvando no Supabase...");

    try {
      const { error } = await action();

      if (error) {
        console.error(error);
        setCloudStatus("Falha ao salvar no Supabase. Verifique se o SQL de salvamento foi executado.");
        alert("Não foi possível salvar no Supabase. Execute o SQL de salvamento e tente novamente.");
        return false;
      }

      setCloudStatus(successMessage);
      alert(successMessage);
      return true;
    } catch (error) {
      console.error(error);
      setCloudStatus("Falha ao salvar no Supabase.");
      alert("Falha ao salvar no Supabase.");
      return false;
    } finally {
      setCloudSaving("");
    }
  }

  function saveBusinessToCloud() {
    return runCloudSave("business", "Dados da barbearia salvos no Supabase", async () => {
      const targetSlug = cloudSlug || business.slug;
      const result = await supabase.rpc("save_business_settings", {
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

      return result;
    });
  }

  function saveAccessAccountsToCloud() {
    return runCloudSave("access", "Acessos do painel salvos no Supabase", () =>
      supabase.rpc("save_barbershop_accesses", {
        target_slug: cloudSlug || business.slug,
        accesses_input: accessAccounts.map((account) => ({
          id: account.id || null,
          email: account.email.trim().toLowerCase(),
          role:
            account.role === "Dono"
              ? "owner"
              : account.role === "Plataforma"
              ? "platform"
              : "manager",
          active: Boolean(account.active),
        })),
      })
    );
  }

  function saveFeatureFlagsToCloud() {
    return runCloudSave("features", "Melhorias salvas no Supabase", () =>
      supabase.rpc("save_feature_flags", {
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
    return runCloudSave("services", "Serviços salvos no Supabase", () =>
      supabase.rpc("save_services", {
        target_slug: cloudSlug || business.slug,
        services_input: services.map((service, index) => ({
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
    return runCloudSave("professionals", "Profissionais salvos no Supabase", () =>
      supabase.rpc("save_professionals", {
        target_slug: cloudSlug || business.slug,
        professionals_input: professionals.map((item) => ({
          id: item.id || null,
          name: item.fixed ? "Primeiro disponivel" : item.name,
          active: Boolean(item.active),
          fixed: Boolean(item.fixed),
        })),
      })
    );
  }

  function saveScheduleToCloud() {
    return runCloudSave("schedule", "Agenda salva no Supabase", () =>
      supabase.rpc("save_schedule_settings", {
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

    const { error } = await supabase.rpc("update_appointment_action", {
      target_slug: cloudSlug || business.slug,
      appointment_id_input: id,
      paid_input: patch.paid ?? null,
      status_input: patch.status ?? null,
      reschedule_requested_input: patch.rescheduleRequested ?? null,
    });

    if (error) {
      console.error(error);
      setCloudStatus("Ação salva localmente. Falhou ao atualizar o Supabase.");
      return;
    }

    setCloudStatus("Agendamento atualizado no Supabase");
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    alert("Copiado: " + text);
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
        role: "Gerente",
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

  function startNewSchedule() {
    setScreen("home");
    setSelectedServices([]);
    setSelectedTime("");
    setPayment("");
    setConfirmedId("");
    setConfirmationSent(false);
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
    setViewMode(adminLoggedIn ? "admin" : "adminLogin");
    window.scrollTo(0, 0);
  }

  function loginAdmin() {
    const normalizedEmail = adminEmail.trim().toLowerCase();
    const emailAllowed =
      normalizedEmail === business.ownerEmail?.trim().toLowerCase() ||
      accessAccounts.some(
        (account) => account.active && account.email.trim().toLowerCase() === normalizedEmail
      );
    const codeAllowed = adminAccessCode.trim() === "123456";

    if (!emailAllowed || !codeAllowed) {
      setAdminLoginError("Email ou código de acesso inválido.");
      return;
    }

    setAdminLoggedIn(true);
    setAdminLoginError("");
    setAdminTab("dashboard");
    setViewMode("admin");
    window.scrollTo(0, 0);
  }

  function logoutAdmin() {
    setAdminLoggedIn(false);
    setAdminAccessCode("");
    setViewMode("client");
    setScreen("home");
    window.scrollTo(0, 0);
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
    setSelectedServices([]);
    setSelectedTime("");
    setPayment("");
    setAdminTab("dashboard");
    setScreen("home");
    markDataSaved();
  }

  function closeToday() {
    if (schedule.daysOff.some((item) => item.date === today)) {
      alert("Hoje já está fechado.");
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
      alert("Não há horário livre hoje.");
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

  if (viewMode === "adminLogin") {
    return (
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
            <button className="whatsappButton" onClick={() => setViewMode("client")}>
              Cliente
            </button>
            <button className="logoutButton" onClick={logoutAdmin}>
              Voltar
            </button>
          </div>
        </section>

        <section className="card loginCard">
          <div className="loginBadge">Acesso restrito</div>
          <h2>Login do barbeiro</h2>
          <p className="hint">
            O painel só aparece para emails cadastrados pela plataforma.
          </p>

          <label>Email cadastrado</label>
          <input
            type="email"
            placeholder="admin@barbearia.com"
            value={adminEmail}
            onChange={(event) => setAdminEmail(event.target.value)}
          />

          <label>Código de acesso</label>
          <input
            type="password"
            placeholder="Digite o código"
            value={adminAccessCode}
            onChange={(event) => setAdminAccessCode(event.target.value)}
          />

          {adminLoginError && <p className="loginError">{adminLoginError}</p>}

          <button className="green" onClick={loginAdmin}>
            Entrar no painel
          </button>

          <p className="adminNote">
            Demo: use admin@barbeariadojoao.com com código 123456. No app real, isso será
            substituído por autenticação segura no backend.
          </p>
        </section>
      </main>
    );
  }

  if (viewMode === "admin") {
    if (!adminLoggedIn) {
      return (
        <main className="app">
          <section className="card loginCard">
            <div className="loginBadge">Acesso restrito</div>
            <h1>Faça login para acessar o painel</h1>
            <button className="green" onClick={() => setViewMode("adminLogin")}>
              Ir para login
            </button>
            <button className="outline" onClick={() => setViewMode("client")}>
              Voltar para cliente
            </button>
          </section>
        </main>
      );
    }

    return (
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
            <button className="whatsappButton" onClick={() => setViewMode("client")}>
              Cliente
            </button>
            <button className="logoutButton" onClick={logoutAdmin}>
              Sair
            </button>
          </div>
        </section>

        <section className="adminTabs">
          {adminTabs.map((tab) => (
            <button
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
            </section>

            <section className="card">
              <div className="sectionTitle">
                <h2>Comandos rápidos</h2>
                <span>Ações do dia</span>
              </div>

              <div className="commandGrid">
                <button onClick={() => setAdminTab("agenda")}>Ver agenda</button>
                <button onClick={blockNextAvailableTime}>Bloquear próximo horário</button>
                <button onClick={closeToday}>Fechar hoje</button>
                <button onClick={openToday}>Liberar hoje</button>
                <button
                  onClick={() => {
                    addService();
                    setAdminTab("services");
                  }}
                >
                  Novo serviço
                </button>
                <button
                  onClick={() => {
                    addProfessional();
                    setAdminTab("services");
                  }}
                >
                  Novo profissional
                </button>
                <button
                  disabled={!featureFlags.pix?.released}
                  onClick={() => {
                    setBusiness((current) => ({ ...current, pixEnabled: !current.pixEnabled }));
                    updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    setAdminTab("payments");
                  }}
                >
                  {pixAvailable ? "Desativar PIX" : "Ativar PIX"}
                </button>
                <button
                  onClick={() => {
                    setViewMode("client");
                    setScreen("home");
                  }}
                >
                  Ver tela do cliente
                </button>
              </div>
            </section>

            <section className="card storageCard">
              <div className="sectionTitle">
                <h2>Dados do app</h2>
                <span>Salvo no navegador</span>
              </div>

              <p className="hint">
                As configurações do painel ficam guardadas neste dispositivo até conectarmos
                um banco de dados real.
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

              <button className="dangerButton" onClick={resetDemoData}>
                Restaurar demonstração
              </button>
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

          <button className="green" onClick={saveScheduleToCloud}>
            {cloudSaving === "schedule" ? "Salvando agenda..." : "Salvar agenda no Supabase"}
          </button>

          <div className="weeklyGrid">
            {weekDays.map((day) => {
              const config = schedule.workingHours[day.key];

              return (
                <div className={config.enabled ? "dayRow" : "dayRow closedDay"} key={day.key}>
                  <button
                    className={config.enabled ? "dayToggle activeDay" : "dayToggle"}
                    onClick={() => updateWorkingDay(day.key, "enabled", !config.enabled)}
                  >
                    {day.short}
                  </button>

                  <div className="dayInfo">
                    <strong>{day.label}</strong>
                    <span>{config.enabled ? `${config.start} até ${config.end}` : "Fechado"}</span>
                  </div>

                  <input
                    type="time"
                    value={config.start}
                    disabled={!config.enabled}
                    onChange={(event) => updateWorkingDay(day.key, "start", event.target.value)}
                  />
                  <input
                    type="time"
                    value={config.end}
                    disabled={!config.enabled}
                    onChange={(event) => updateWorkingDay(day.key, "end", event.target.value)}
                  />
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

              <button className="dangerButton" onClick={() => removeBreak(index)}>
                Remover intervalo
              </button>
            </div>
          ))}

          <button className="black" onClick={addBreak}>
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
              <button className="dangerButton" onClick={() => removeDayOff(index)}>
                Remover folga
              </button>
            </div>
          ))}

          <button className="black" onClick={addDayOff}>
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

              <button className="dangerButton" onClick={() => removeBlock(index)}>
                Remover bloqueio
              </button>
            </div>
          ))}

          <button className="black" onClick={addBlock}>
            Adicionar bloqueio
          </button>
        </section>

        <section className={adminTab === "services" ? "card" : "hiddenPanel"}>
          <h2>Serviços</h2>
          {services.map((service, index) => (
            <div className="adminItem" key={index}>
              <label>Nome</label>
              <input value={service.name} onChange={(event) => updateService(index, "name", event.target.value)} />

              <div className="timePair">
                <div>
                  <label>Tempo</label>
                  <input type="number" value={service.duration} onChange={(event) => updateService(index, "duration", event.target.value)} />
                </div>
                <div>
                  <label>Preço</label>
                  <input type="number" value={service.price} onChange={(event) => updateService(index, "price", event.target.value)} />
                </div>
              </div>

              <button className={service.active ? "selected" : ""} onClick={() => updateService(index, "active", !service.active)}>
                {service.active ? "Serviço ativo" : "Serviço inativo"}
              </button>
            </div>
          ))}

          <button className="black" onClick={addService}>
            Adicionar serviço
          </button>

          <button className="green" onClick={saveServicesToCloud}>
            {cloudSaving === "services" ? "Salvando serviços..." : "Salvar serviços no Supabase"}
          </button>
        </section>

        <section className={adminTab === "services" ? "card" : "hiddenPanel"}>
          <h2>Profissionais</h2>
          {professionals.map((item, index) => (
            <div className="adminItem barberItem" key={index}>
              <div className="barberHeader">
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.active ? "Aparece para o cliente" : "Oculto para o cliente"}</p>
                </div>
                <button
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
              {item.fixed && <p className="hint">Esta opção escolhe alguém livre automaticamente.</p>}
              {!item.fixed && (
                <button className="dangerButton" onClick={() => removeProfessional(index)}>
                  Remover profissional
                </button>
              )}
            </div>
          ))}

          <button className="black" onClick={addProfessional}>
            Adicionar profissional
          </button>

          <button className="green" onClick={saveProfessionalsToCloud}>
            {cloudSaving === "professionals"
              ? "Salvando profissionais..."
              : "Salvar profissionais no Supabase"}
          </button>
        </section>

        <section className={adminTab === "payments" ? "card" : "hiddenPanel"}>
          <h2>Pagamentos</h2>
          <button
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
            value={business.pixDiscount}
            onChange={(event) => setBusiness({ ...business, pixDiscount: Number(event.target.value) })}
          />

          <h2>Opcionais</h2>
          <p className="hint">
            Promoções, lista de espera e fidelidade ficam bloqueados até serem liberados
            na aba Melhorias.
          </p>

          <button className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando pagamentos..." : "Salvar pagamentos no Supabase"}
          </button>
        </section>

        <section className={adminTab === "improvements" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Melhorias</h2>
            <span>Liberação da plataforma</span>
          </div>

          <p className="hint">
            Recursos novos começam bloqueados e são liberados por atualização ou plano da mensalidade.
            Plano atual: {currentPlan.name}.
          </p>

          <div className="featureGrid">
            {platformFeatures.map((feature) => (
              <div
                className={
                  featureFlags[feature.key]?.released
                    ? "featureCard availableFeature"
                    : "featureCard lockedFeature"
                }
                key={feature.key}
              >
                <div className="featureHeader">
                  <strong>{feature.title}</strong>
                  <span>{featureFlags[feature.key]?.released ? "Liberado" : "Bloqueado"}</span>
                </div>
                <p>{feature.description}</p>

                <div className="featureActions">
                  <button
                    onClick={() =>
                      updateFeatureFlag(
                        feature.key,
                        "released",
                        !featureFlags[feature.key]?.released
                      )
                    }
                  >
                    {featureFlags[feature.key]?.released ? "Bloquear recurso" : "Liberar recurso"}
                  </button>

                  <button
                    disabled={
                      !featureFlags[feature.key]?.released ||
                      feature.key === "pix" ||
                      feature.key === "auto_confirmation"
                    }
                    onClick={() =>
                      updateFeatureFlag(feature.key, "enabled", !featureFlags[feature.key]?.enabled)
                    }
                  >
                    {featureFlags[feature.key]?.enabled ? "Desativar na barbearia" : "Ativar na barbearia"}
                  </button>
                </div>

                {feature.key === "pix" && featureFlags.pix?.released && (
                  <button
                    onClick={() => {
                      setBusiness({ ...business, pixEnabled: !business.pixEnabled });
                      updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    }}
                  >
                    {pixAvailable ? "PIX ativo no checkout" : "Ativar PIX no checkout"}
                  </button>
                )}

                {feature.key === "auto_confirmation" &&
                  featureFlags.auto_confirmation?.released && (
                    <button
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
              </div>
            ))}
          </div>

          <button className="green" onClick={saveFeatureFlagsToCloud}>
            {cloudSaving === "features" ? "Salvando melhorias..." : "Salvar melhorias no Supabase"}
          </button>
        </section>

        <section className={adminTab === "account" ? "card accountCard" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Conta</h2>
            <span>Mensalidade e link</span>
          </div>

          <div className="accountHero">
            <span>App da barbearia</span>
            <strong>{business.slug || "barbearia"}</strong>
            <p>
              Cada barbearia tem um app próprio pelo identificador do link. Cliente acessa
              o agendamento; barbeiro acessa o painel protegido.
            </p>
          </div>

          <label>Email responsável</label>
          <input
            type="email"
            value={business.ownerEmail || ""}
            onChange={(event) => setBusiness({ ...business, ownerEmail: event.target.value })}
          />

          <label>Identificador do link</label>
          <input
            value={business.slug || ""}
            onChange={(event) => updateBusinessSlug(event.target.value)}
            placeholder="barbearia-do-joao"
          />

          <label>Link para divulgar</label>
          <input value={publicScheduleLink} readOnly />

          <button className="black" onClick={() => copyText(publicScheduleLink)}>
            Copiar link de agendamento
          </button>

          <label>Link do painel</label>
          <input value={adminPanelLink} readOnly />

          <button className="outline" onClick={() => copyText(adminPanelLink)}>
            Copiar link do painel
          </button>

          <div className="accessHeader">
            <div>
              <span>Acessos ao painel</span>
              <strong>{accessAccounts.filter((account) => account.active).length} ativos</strong>
            </div>
            <button onClick={addAccessAccount}>Adicionar</button>
          </div>

          <div className="accessList">
            {accessAccounts.map((account, index) => (
              <div className="accessItem" key={account.id || index}>
                <label>Email de acesso</label>
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
                      <option value="Gerente">Gerente</option>
                      <option value="Plataforma">Plataforma</option>
                    </select>
                  </div>
                  <div>
                    <label>Status</label>
                    <button
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
                  <button className="dangerButton" onClick={() => removeAccessAccount(index)}>
                    Remover acesso
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="green" onClick={saveAccessAccountsToCloud}>
            {cloudSaving === "access" ? "Salvando acessos..." : "Salvar acessos no Supabase"}
          </button>

          <div className="planHeader">
            <div>
              <span>Plano atual</span>
              <strong>{currentPlan.name}</strong>
            </div>
            <b>{currentPlan.price}</b>
          </div>

          <div className="planGrid">
            {planOptions.map((plan) => (
              <button
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
            No app real, essa conta será salva no banco de dados e o login vai carregar
            automaticamente a barbearia certa pelo email cadastrado.
          </p>

          <button className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando conta..." : "Salvar conta no Supabase"}
          </button>
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
            <button
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

          <label>Titulo da tela final</label>
          <input value={business.successTitle} onChange={(event) => setBusiness({ ...business, successTitle: event.target.value })} />

          <label>Mensagem principal</label>
          <input value={business.successMessage} onChange={(event) => setBusiness({ ...business, successMessage: event.target.value })} />

          <label>Mensagem final</label>
          <input value={business.successFooter} onChange={(event) => setBusiness({ ...business, successFooter: event.target.value })} />

          <button className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando aparência..." : "Salvar aparência no Supabase"}
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
                  <button onClick={() => confirmAppointmentPayment(appointment.id)}>
                    Confirmar pagamento
                  </button>
                )}
                <button onClick={() => rescheduleAppointment(appointment.id)}>
                  {appointment.rescheduleRequested ? "Remarcação marcada" : "Remarcar"}
                </button>
                <button className="dangerAction" onClick={() => cancelAppointment(appointment.id)}>
                  Cancelar
                </button>
              </div>
            </div>
          ))}
        </section>
      </main>
    );
  }

  if (screen === "success") {
    return (
      <main className="app">
        <section className="card success">
          <div className="badge">Agendado</div>
          <h1>{business.successTitle}</h1>
          <p>{business.successMessage}</p>
          <p>Te esperamos na {business.name}.</p>
          <p>{business.address}</p>
          {confirmationSent && <p>{business.successFooter}</p>}
          <p>
            <strong>
              {formatDate(selectedDate)} às {selectedTime}
            </strong>{" "}
            - {servicesText}
          </p>
          <p>Profissional: {professional}</p>
          <p className="hint">
            Em caso de cancelamento ou reagendamento, entre em contato com o barbeiro.
          </p>
          <a
            className="black linkButton"
            href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
              `Olá! Preciso falar sobre meu agendamento de ${formatDate(selectedDate)} às ${selectedTime}.`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            Falar com barbeiro
          </a>
          <button className="outline" onClick={startNewSchedule}>
            Novo agendamento
          </button>
        </section>
      </main>
    );
  }

  if (screen === "confirm") {
    return (
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
          <p>
            <strong>Total:</strong> {money(totalPrice)}
          </p>
        </section>

        <section className="card paymentCard">
          <h2>Pagamento</h2>

          {pixAvailable && (
            <button
              className={payment === "pix" ? "paymentOption selected" : "paymentOption"}
              onClick={() => setPayment("pix")}
            >
              <span>
                <strong>PIX antecipado</strong>
                <small>Com desconto - {money(pixPrice)}</small>
              </span>
              <span className="serviceCheck">{payment === "pix" ? "✓" : "+"}</span>
            </button>
          )}

          <button
            className={payment === "local" ? "paymentOption selected" : "paymentOption"}
            onClick={() => setPayment("local")}
          >
            <span>
              <strong>Pagar no local</strong>
              <small>Finalize agora e pague no atendimento</small>
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
              <button className="black" onClick={() => copyText(business.pixKey)}>
                Copiar chave PIX
              </button>
            </div>
          )}
        </section>

        <section className="checkoutActions">
          <div className="summaryLine">
            <span>Total</span>
            <strong>{payment === "pix" ? money(pixPrice) : money(totalPrice)}</strong>
          </div>
          <button className="confirmButton" onClick={finishSchedule}>
            Confirmar agendamento
          </button>
          <button className="outline" onClick={() => setScreen("home")}>
            Voltar
          </button>

          <p className="helpText">
            Precisa de ajuda?{" "}
            <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">
              Falar com barbeiro
            </a>
          </p>
        </section>
      </main>
    );
  }

  if (scheduleBlocked) {
    return (
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
            Falar com barbeiro
          </a>

          <button className="outline" onClick={openAdminArea}>
            Área do barbeiro
          </button>
        </section>
      </main>
    );
  }

  return (
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

        <a className="miniWhatsapp" href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noreferrer">
          WhatsApp
        </a>
      </header>

      <section className="heroPanel">
        <div>
          <span>Agendamento online</span>
          <strong>Escolha seu atendimento</strong>
        </div>
        <p>Informe seus dados, escolha os serviços e receba uma sugestão de horário ideal.</p>
        <button className="adminButton" onClick={openAdminArea}>
          Área do barbeiro
        </button>
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
            <button className="black" onClick={repeatLastService}>
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
          <button
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

      {selectedServices.length > 0 && (
        <section className="recommendBox bestTimePanel">
          <span>Melhor opção para os serviços escolhidos</span>
          <strong>{recommendedTime || "Agenda cheia"}</strong>
          <small>
            Sugestão calculada para {totalDuration || schedule.slotInterval} min de atendimento.
          </small>
        </section>
      )}

      <section className="card">
        <div className="sectionTitle">
          <h2>Profissional</h2>
          <span>Opcional</span>
        </div>

        <div className="chips">
          {professionals
            .filter((item) => item.active || item.fixed)
            .map((item) => (
            <button
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

      <section className="card">
        <div className="sectionTitle">
          <h2>Agenda</h2>
          <span>Horários inteligentes</span>
        </div>
        <p className="hint">A agenda considera funcionamento, pausas, bloqueios e horários ocupados.</p>

        <div className="rangeTabs">
          <button className={range === "today" ? "selected" : ""} onClick={() => setRange("today")}>
            Hoje
          </button>
          <button className={range === "week" ? "selected" : ""} onClick={() => setRange("week")}>
            Semana
          </button>
          <button className={range === "twoMonths" ? "selected" : ""} onClick={() => setRange("twoMonths")}>
            2 meses
          </button>
        </div>

        <div className="dateGrid">
          {dateOptions.map((dateText) => {
            const dateInfo = dateParts(dateText);
            const availability = getDateAvailability(dateText);

            return (
              <button
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

        <div className="sectionTitle compactTitle">
          <h2>Horários</h2>
          <span>{formatDate(selectedDate)}</span>
        </div>

        {slots.length === 0 ? (
          <div className="emptySchedule">
            <strong>Fechado nesta data</strong>
            <p>Escolha outro dia ou ajuste a agenda no painel.</p>
          </div>
        ) : (
          <div className="timeGrid">
            {slots.map((slot) => (
              <button
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
      </section>

      <section className="bottomBar">
        <div className="bottomTitle">Resumo do agendamento</div>
        <div className="summaryLine">
          <span>Data</span>
          <strong>{formatDate(selectedDate)}</strong>
        </div>
        <div className="summaryLine">
          <span>Tempo</span>
          <strong>{totalDuration} min</strong>
        </div>
        <div className="summaryLine">
          <span>Total</span>
          <strong className="bottomTotal">{money(totalPrice)}</strong>
        </div>
        <button className={canContinue ? "green" : "green disabled"} onClick={goCheckout}>
          Continuar →
        </button>
      </section>
    </main>
  );
}
