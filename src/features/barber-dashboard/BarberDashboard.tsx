import React, { useEffect, useRef, useState } from "react";
import type { AdminTabId } from "../../lib/permissions";
import type { Appointment, FeatureDefinition, FeatureFlag } from "../../types/app";
import AgendaPanel from "./panels/AgendaPanel";
import AgendaTodayPanel from "./panels/AgendaTodayPanel";
import AccountPanel from "./panels/AccountPanel";
import AppearancePanel from "./panels/AppearancePanel";
import CustomersPanel from "./panels/CustomersPanel";
import ImprovementsPanel from "./panels/ImprovementsPanel";
import PaymentsPanel from "./panels/PaymentsPanel";
import ProfessionalsPanel from "./panels/ProfessionalsPanel";
import ServicesPanel from "./panels/ServicesPanel";
import type { AccountPanelModel } from "./panels/AccountPanel";
import type { AgendaPanelModel } from "./panels/AgendaPanel";
import type { AgendaTodayPanelModel } from "./panels/AgendaTodayPanel";
import type { AppearancePanelModel } from "./panels/AppearancePanel";
import type { CustomersPanelModel } from "./panels/CustomersPanel";
import type { FeatureShortcut, ImprovementsPanelModel } from "./panels/ImprovementsPanel";
import type { PaymentsPanelModel } from "./panels/PaymentsPanel";
import type { ProfessionalsPanelModel } from "./panels/ProfessionalsPanel";
import type { ServicesPanelModel } from "./panels/ServicesPanel";

type AdminTab = {
  id: AdminTabId | string;
  label: string;
};

type SetupItem = {
  description: string;
  done: boolean;
  label: string;
  tab: string;
};

type OnboardingStep = {
  action: () => void;
  buttonLabel: string;
  description: string;
  done: boolean;
  label: string;
  tab?: string;
};

type FeatureStatusCard = FeatureDefinition & {
  planAllowed?: boolean;
  shortcut: FeatureShortcut;
  state: FeatureFlag;
  statusLabel: string;
};

type WhatsAppIntegrationStatus = {
  message: string;
  providerLabel?: string;
  ready: boolean;
};

type BarberDashboardModel =
  AccountPanelModel &
  AgendaPanelModel &
  AgendaTodayPanelModel &
  AppearancePanelModel &
  CustomersPanelModel &
  ImprovementsPanelModel &
  PaymentsPanelModel &
  ProfessionalsPanelModel &
  ServicesPanelModel & {
  activeFeatureCount: number;
  adminLoggedIn: boolean;
  adminTabs: AdminTab[];
  agendaStatus: string;
  blockNextAvailableTime: () => void;
  clientName?: string;
  closeToday: () => void;
  cloudStatus: string;
  commissionsAvailable: boolean;
  completedSetupItems: number;
  dataSavedAt: string;
  featureStatusCards: FeatureStatusCard[];
  goToClientView: () => void;
  logoutAdmin: () => void;
  openToday: () => void;
  professional?: string;
  refreshWhatsappIntegrationStatus: () => void;
  resetDemoData: () => void;
  setupItems: SetupItem[];
  setupProgress: number;
  setViewMode: (viewMode: string) => void;
  todayAppointments: Appointment[];
  todayRevenue: number;
  upcomingAppointments: Appointment[];
  visibleAdminTabs: AdminTab[];
  whatsappIntegrationStatus: WhatsAppIntegrationStatus;
  withNotice: (content: React.ReactNode) => React.ReactNode;
};

type BarberDashboardProps = {
  model: BarberDashboardModel;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const pwaBannerDismissKey = "agendapro:pwa-install-dismissed";

export default function BarberDashboard({ model }: BarberDashboardProps) {
  const {
    accessAccounts,
    activeAdminTab,
    activeFeatureCount,
    addProfessional,
    addService,
    adminLoggedIn,
    adminTabs,
    agendaStatus,
    appointments,
    blockNextAvailableTime,
    business,
    canManageBilling,
    canManageBusinessSettings,
    canUseAdminTab,
    clientName,
    closeToday,
    cloudStatus,
    commissionsAvailable,
    completedSetupItems,
    copyText,
    customerProfiles,
    dataSavedAt,
    featureFlags,
    featureStatusCards,
    formatDate,
    goToClientView,
    logoutAdmin,
    money,
    openToday,
    pixAvailable,
    professional,
    professionals,
    publicScheduleLink,
    refreshWhatsappIntegrationStatus,
    resetDemoData,
    schedule,
    services,
    setAdminTab,
    setBusiness,
    setupItems,
    setupProgress,
    setViewMode,
    todayAppointments,
    todayRevenue,
    upcomingAppointments,
    updateFeatureFlag,
    visibleAdminTabs,
    whatsappIntegrationStatus,
    withNotice,
  } = model;

  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLElement | null>(null);

  const currentAdminTab = visibleAdminTabs.find((tab) => tab.id === activeAdminTab);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    if (window.localStorage.getItem(pwaBannerDismissKey) === "1") {
      return undefined;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setShowInstallBanner(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!adminMenuOpen || typeof window === "undefined") return undefined;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAdminMenuOpen(false);
      }
    }

    function closeOnOutsideClick(event: PointerEvent) {
      const target = event.target;

      if (target instanceof Node && adminMenuRef.current?.contains(target)) {
        return;
      }

      setAdminMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnOutsideClick);

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnOutsideClick);
    };
  }, [adminMenuOpen]);

  async function installPwaNow() {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;

    if (choice.outcome === "accepted") {
      setShowInstallBanner(false);
      setInstallPromptEvent(null);
      return;
    }

    dismissInstallBanner();
  }

  function dismissInstallBanner() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(pwaBannerDismissKey, "1");
    }

    setShowInstallBanner(false);
    setInstallPromptEvent(null);
  }
  const visibleSetupItems = setupItems.filter((item) => canUseAdminTab(item.tab));
  const firstPendingSetup = visibleSetupItems.find((item) => !item.done);
  const commercialReady = setupProgress >= 100 && !firstPendingSetup;
  const [setupLinkCopied, setSetupLinkCopied] = useState(false);
  const nextAppointment = upcomingAppointments[0] || todayAppointments[0];
  const activeServiceCount = services.filter((item) => item.active).length;
  const activeProfessionalCount = professionals.filter((item) => item.active && !item.fixed).length;
  const todayPaidAppointments = todayAppointments.filter((appointment) => appointment.paid);
  const todayPendingPaymentAppointments = todayAppointments.filter((appointment) => !appointment.paid);
  const todayPaidRevenue = todayPaidAppointments.reduce((sum, appointment) => sum + Number(appointment.total || 0), 0);
  const todayPendingRevenue = todayPendingPaymentAppointments.reduce(
    (sum, appointment) => sum + Number(appointment.total || 0),
    0
  );
  const normalizePaymentMode = (appointment: Appointment) => {
    const paymentMode = String(appointment.payment || "").toLowerCase();

    if (paymentMode.includes("pix")) return "pix";
    if (paymentMode.includes("cart")) return "card";
    if (paymentMode.includes("dinheiro")) return "cash";
    if (paymentMode.includes("cash")) return "cash";
    if (paymentMode.includes("local") && appointment.paid) return "cash";
    if (appointment.paid) return "cash";

    return "pending";
  };
  const todayCashRevenue = todayAppointments
    .filter((appointment) => appointment.paid && normalizePaymentMode(appointment) === "cash")
    .reduce((sum, appointment) => sum + Number(appointment.total || 0), 0);
  const todayPixRevenue = todayAppointments
    .filter((appointment) => appointment.paid && normalizePaymentMode(appointment) === "pix")
    .reduce((sum, appointment) => sum + Number(appointment.total || 0), 0);
  const todayCardRevenue = todayAppointments
    .filter((appointment) => appointment.paid && normalizePaymentMode(appointment) === "card")
    .reduce((sum, appointment) => sum + Number(appointment.total || 0), 0);
  const professionalByName = new Map(
    professionals.map((professionalItem) => [
      String(professionalItem.name || "").trim().toLowerCase(),
      professionalItem,
    ])
  );
  const getCommissionPercent = (appointment: Appointment) => {
    const professionalConfig = professionalByName.get(
      String(appointment.professional || "").trim().toLowerCase()
    );

    if (!professionalConfig) return 0;

    const serviceText = String(appointment.services || "").toLowerCase();
    const matchedService = services.find((service) =>
      serviceText.includes(String(service.name || "").toLowerCase())
    );
    const serviceCommission =
      matchedService && professionalConfig.commissionByService
        ? professionalConfig.commissionByService[matchedService.name]
        : undefined;

    return Number(serviceCommission ?? professionalConfig.commissionPercent ?? 0);
  };
  const getCommissionValue = (appointment: Appointment) =>
    commissionsAvailable
      ? (Number(appointment.total || 0) * getCommissionPercent(appointment)) / 100
      : 0;
  const todayCommissionTotal = todayAppointments.reduce(
    (sum, appointment) => sum + getCommissionValue(appointment),
    0
  );
  const todayPaidCommissionTotal = todayAppointments
    .filter((appointment) => appointment.paid)
    .reduce((sum, appointment) => sum + getCommissionValue(appointment), 0);
  const todayPendingCommissionTotal = Math.max(
    0,
    todayCommissionTotal - todayPaidCommissionTotal
  );
  const todayDiscounts = todayAppointments.reduce(
    (sum, appointment) =>
      sum +
      Math.max(
        0,
        Number((appointment as Appointment & { originalTotal?: number }).originalTotal || 0) -
          Number(appointment.total || 0)
      ),
    0
  );
  const estimatedDailyProfit = Math.max(0, todayPaidRevenue - todayPaidCommissionTotal);
  const professionalCommissionReport = professionals
    .filter((professionalItem) => professionalItem.active && !professionalItem.fixed)
    .map((professionalItem) => {
      const professionalAppointments = todayAppointments.filter(
        (appointment) => appointment.professional === professionalItem.name
      );
      const expectedCommission = professionalAppointments.reduce(
        (sum, appointment) => sum + getCommissionValue(appointment),
        0
      );
      const paidCommission = professionalAppointments
        .filter((appointment) => appointment.paid)
        .reduce((sum, appointment) => sum + getCommissionValue(appointment), 0);

      return {
        name: professionalItem.name,
        appointmentCount: professionalAppointments.length,
        percent: Number(professionalItem.commissionPercent || 0),
        expectedCommission,
        paidCommission,
        pendingCommission: Math.max(0, expectedCommission - paidCommission),
      };
    });
  const activeTodayAppointments = todayAppointments.filter(
    (appointment) => appointment.status !== "cancelled"
  );
  const attendedToday = todayAppointments.filter(
    (appointment) => appointment.status === "completed" || appointment.paid
  ).length;
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const clientKey = (appointment: Appointment) =>
    String(appointment.whatsapp || appointment.clientName || "").trim().toLowerCase();
  const firstAppointmentDateByClient = appointments.reduce((map, appointment) => {
    const key = clientKey(appointment);
    const date = String(appointment.date || "");

    if (!key || !date) return map;
    if (!map.has(key) || date < String(map.get(key))) {
      map.set(key, date);
    }

    return map;
  }, new Map<string, string>());
  const currentMonthAppointments = appointments.filter((appointment) =>
    String(appointment.date || "").startsWith(currentMonthKey)
  );
  const currentMonthClients = new Set(
    currentMonthAppointments.map(clientKey).filter(Boolean)
  ).size;
  const newClientsThisMonth = new Set(
    currentMonthAppointments
      .filter((appointment) =>
        String(firstAppointmentDateByClient.get(clientKey(appointment)) || "").startsWith(
          currentMonthKey
        )
      )
      .map(clientKey)
      .filter(Boolean)
  ).size;
  const weekDayKeys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const todayWeekKey = weekDayKeys[new Date().getDay()];
  const todayWorkingHours = schedule.workingHours?.[todayWeekKey];
  const toMinutes = (time = "00:00") => {
    const [hours, minutes] = String(time || "00:00").split(":").map(Number);
    return (Number.isFinite(hours) ? hours : 0) * 60 + (Number.isFinite(minutes) ? minutes : 0);
  };
  const workStart = toMinutes(todayWorkingHours?.start);
  const workEnd = toMinutes(todayWorkingHours?.end);
  const todayBreakMinutes = schedule.breaks.reduce((sum, item) => {
    const start = Math.max(workStart, toMinutes(item.start));
    const end = Math.min(workEnd, toMinutes(item.end));
    return sum + Math.max(0, end - start);
  }, 0);
  const workingMinutes =
    todayWorkingHours?.enabled && workEnd > workStart
      ? Math.max(0, workEnd - workStart - todayBreakMinutes)
      : 0;
  const estimateAppointmentDuration = (appointment: Appointment) => {
    if (Number(appointment.duration || 0) > 0) return Number(appointment.duration);

    const appointmentServices = String(appointment.services || "").toLowerCase();
    const matchedServices = services.filter((service) =>
      appointmentServices.includes(String(service.name || "").toLowerCase())
    );
    const matchedDuration = matchedServices.reduce(
      (sum, service) => sum + Number(service.duration || 0),
      0
    );

    return matchedDuration || schedule.slotInterval || 30;
  };
  const scheduledMinutes = activeTodayAppointments.reduce(
    (sum, appointment) => sum + estimateAppointmentDuration(appointment),
    0
  );
  const occupancyRate = workingMinutes
    ? Math.min(100, Math.round((scheduledMinutes / workingMinutes) * 100))
    : 0;
  const serviceRanking = Array.from(
    appointments
      .flatMap((appointment) =>
        String(appointment.services || "")
          .split(/[+,]/)
          .map((service) => service.trim())
          .filter(Boolean)
      )
      .reduce((ranking, service) => {
        ranking.set(service, (ranking.get(service) || 0) + 1);
        return ranking;
      }, new Map<string, number>())
      .entries()
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const topService = serviceRanking[0];
  const topServiceName = topService?.[0] || "Sem dados";
  const topServiceNameClass =
    topServiceName.length > 18 ? "serviceHeroName serviceHeroNameLong" : "serviceHeroName";
  const planLabels: Record<string, string> = {
    starter: "Inicial",
    professional: "Profissional",
    premium: "Premium",
  };
  const statusLabels: Record<string, string> = {
    active: "Ativa",
    archived: "Arquivada",
    blocked: "Bloqueada",
    cancelled: "Cancelada",
    overdue: "Atrasada",
    pending: "Pendente",
    trial: "Em teste",
  };
  const planLabel = planLabels[String(business.plan || "")] || business.plan || "Sem plano";
  const statusLabel =
    statusLabels[String(business.monthlyStatus || "")] || business.monthlyStatus || "Sem status";
  const nextBillingLabel = business.nextBillingDate
    ? formatDate(business.nextBillingDate)
    : "Sem vencimento";
  const dayTrendCounts = Array.from({ length: 5 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return appointments.filter((appointment) => appointment.date === key).length;
  });
  const trendMax = Math.max(1, ...dayTrendCounts);
  const dashboardBars = dayTrendCounts.map((count) =>
    Math.max(14, Math.round((count / trendMax) * 44))
  );
  const scheduleShareText = `Agende seu horário online na ${business.name}: ${publicScheduleLink}`;
  const scheduleBioText = `Agende seu horário online na ${business.name}\n${publicScheduleLink}`;
  const scheduleWhatsappShareLink = `https://wa.me/?text=${encodeURIComponent(scheduleShareText)}`;
  const hasCustomAppearance = Boolean(
    business.logoImage ||
      business.clientBackgroundUrl ||
      business.adminBackgroundUrl ||
      business.beforeImageUrl ||
      business.processImageUrl ||
      business.finalImageUrl ||
      (business.themeColor && business.themeColor !== "#22c55e") ||
      (business.themeColorSecondary && business.themeColorSecondary !== "#4ade80")
  );
  const onboardingSteps: OnboardingStep[] = [
    {
      label: "Complete os dados da barbearia",
      description: "Nome, WhatsApp, endereço e rota para o cliente chegar sem dúvida.",
      done: Boolean(business.name && business.whatsapp && business.address),
      tab: "appearance",
      buttonLabel: "Completar dados",
      action: () => setAdminTab("appearance"),
    },
    {
      label: "Cadastre seus serviços",
      description: "Preços, tempo médio e serviços ativos para o cliente escolher.",
      done: activeServiceCount > 0,
      tab: "services",
      buttonLabel: "Cadastrar serviços",
      action: () => setAdminTab("services"),
    },
    {
      label: "Cadastre profissionais",
      description: "Equipe disponível para organizar horários por profissional.",
      done: activeProfessionalCount > 0,
      tab: "professionals",
      buttonLabel: "Cadastrar profissionais",
      action: () => setAdminTab("professionals"),
    },
    {
      label: "Configure horários",
      description: "Funcionamento, pausas, folgas e bloqueios da agenda real.",
      done: Object.values(schedule.workingHours).some((item) => item.enabled),
      tab: "agenda",
      buttonLabel: "Configurar horários",
      action: () => setAdminTab("agenda"),
    },
    {
      label: "Personalize a aparência",
      description: "Logo, capa, cores, fotos e mensagem de boas-vindas.",
      done: hasCustomAppearance,
      tab: "appearance",
      buttonLabel: "Personalizar tela",
      action: () => setAdminTab("appearance"),
    },
    {
      label: "Copie seu link de agendamento",
      description: "Use o link na bio do Instagram, status do WhatsApp e mensagens.",
      done: setupLinkCopied,
      buttonLabel: "Copiar link",
      action: () => {
        copyText(publicScheduleLink);
        setSetupLinkCopied(true);
      },
    },
  ];
  const visibleOnboardingSteps = onboardingSteps.filter(
    (step) => !step.tab || canUseAdminTab(step.tab)
  );
  const completedOnboardingSteps = visibleOnboardingSteps.filter((step) => step.done).length;
  const onboardingProgress = Math.round(
    (completedOnboardingSteps / Math.max(visibleOnboardingSteps.length, 1)) * 100
  );
  const nextOnboardingStep = visibleOnboardingSteps.find((step) => !step.done);

  const exportDate = new Date().toISOString().slice(0, 10);

  function csvValue(value: unknown) {
    const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(fileName: string, headers: string[], rows: Array<Array<unknown>>) {
    const csv = [headers, ...rows].map((row) => row.map(csvValue).join(";")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadText(fileName: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportAppointmentsCsv() {
    downloadCsv(
      `agendapro-agendamentos-${business.slug || "barbearia"}-${exportDate}.csv`,
      ["Data", "Horario", "Cliente", "WhatsApp", "Profissional", "Servicos", "Total", "Pago", "Status"],
      appointments.map((appointment) => [
        formatDate(appointment.date),
        appointment.time,
        appointment.clientName,
        appointment.whatsapp,
        appointment.professional,
        appointment.services,
        money(appointment.total),
        appointment.paid ? "Sim" : "Nao",
        appointment.status || "confirmado",
      ])
    );
  }

  function exportCustomersCsv() {
    downloadCsv(
      `agendapro-clientes-${business.slug || "barbearia"}-${exportDate}.csv`,
      ["Nome", "WhatsApp", "Visitas", "Receita", "Pagamento pendente", "Ultimo atendimento", "Ultimos servicos"],
      customerProfiles.map((customer) => [
        customer.name,
        customer.whatsapp,
        customer.visits,
        money(customer.revenue),
        money(customer.pendingPayment),
        `${formatDate(customer.lastDate)} ${customer.lastTime || ""}`,
        customer.lastServices,
      ])
    );
  }

  function dailyCashRows() {
    return [
      ["Faturamento do dia", money(todayRevenue), `${todayAppointments.length} agendamento(s)`],
      ["Recebido", money(todayPaidRevenue), `${todayPaidAppointments.length} pago(s)`],
      ["Dinheiro", money(todayCashRevenue), ""],
      ["PIX", money(todayPixRevenue), ""],
      ["Cartão", money(todayCardRevenue), ""],
      ["Pendente", money(todayPendingRevenue), `${todayPendingPaymentAppointments.length} pendente(s)`],
      ["Descontos", money(todayDiscounts), ""],
      ["Comissões previstas", money(todayCommissionTotal), ""],
      ["Comissões pagas", money(todayPaidCommissionTotal), ""],
      ["Lucro estimado", money(estimatedDailyProfit), ""],
    ];
  }

  function exportDailyCashCsv() {
    downloadCsv(
      `agendapro-caixa-${business.slug || "barbearia"}-${exportDate}.csv`,
      ["Resumo", "Valor", "Quantidade"],
      [
        ["Previsto", money(todayRevenue), todayAppointments.length],
        ["Recebido", money(todayPaidRevenue), todayPaidAppointments.length],
        ["Dinheiro", money(todayCashRevenue), ""],
        ["PIX", money(todayPixRevenue), ""],
        ["Cartão", money(todayCardRevenue), ""],
        ["Pendente", money(todayPendingRevenue), todayPendingPaymentAppointments.length],
        ["Descontos", money(todayDiscounts), ""],
        ["Comissões previstas", money(todayCommissionTotal), ""],
        ["Comissões pagas", money(todayPaidCommissionTotal), ""],
        ["Lucro estimado", money(estimatedDailyProfit), ""],
      ]
    );
  }

  function exportDailyCashTxt() {
    const rows = dailyCashRows()
      .map(([label, value, detail]) => `${label}: ${value}${detail ? ` - ${detail}` : ""}`)
      .join("\n");
    downloadText(
      `agendapro-fechamento-${business.slug || "barbearia"}-${exportDate}.txt`,
      `AgendaPro - Fechamento do dia\n${business.name}\n${formatDate(exportDate)}\n\n${rows}\n`
    );
  }

  function exportDailyCashPdf() {
    const rows = dailyCashRows()
      .map(
        ([label, value, detail]) =>
          `<tr><td>${label}</td><td>${value}</td><td>${detail || ""}</td></tr>`
      )
      .join("");
    const reportWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!reportWindow) {
      alert("Não foi possível abrir a impressão. Permita pop-ups para gerar PDF.");
      return;
    }
    reportWindow.document.write(`<!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Fechamento do dia - AgendaPro</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111827; margin: 32px; }
            h1 { margin: 0 0 6px; }
            p { color: #4b5563; margin: 0 0 24px; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border-bottom: 1px solid #e5e7eb; padding: 12px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Fechamento do dia</h1>
          <p>${business.name} - ${formatDate(exportDate)}</p>
          <table>
            <thead><tr><th>Resumo</th><th>Valor</th><th>Detalhe</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>`);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  }

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

        {showInstallBanner && installPromptEvent && (
          <section className="pwaInstallBanner" role="status" aria-live="polite">
            <div>
              <strong>Instale o AgendaPro no celular</strong>
              <p>Acesse o painel com um toque e mantenha a agenda pronta mesmo offline.</p>
            </div>
            <div className="pwaInstallActions">
              <button type="button" className="green" onClick={installPwaNow}>
                Instalar
              </button>
              <button type="button" className="outline" onClick={dismissInstallBanner}>
                Agora não
              </button>
            </div>
          </section>
        )}

        <section ref={adminMenuRef} className={adminMenuOpen ? "adminTabs isOpen" : "adminTabs"}>
          <button
            type="button"
            className="adminTabsToggle"
            aria-expanded={adminMenuOpen}
            onClick={() => setAdminMenuOpen((isOpen) => !isOpen)}
          >
            <span className="hamburgerIcon" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span>
              <small>Menu do painel</small>
              <strong>{currentAdminTab?.label || "Painel"}</strong>
            </span>
          </button>

          {adminMenuOpen && (
            <div className="adminTabsMenu" role="menu" aria-label="Secoes do painel da barbearia">
              {visibleAdminTabs.map((tab) => (
                <button
                  type="button"
                  key={tab.id}
                  className={activeAdminTab === tab.id ? "activeAdminTab" : ""}
                  onClick={() => {
                    setAdminTab(tab.id);
                    setAdminMenuOpen(false);
                  }}
                  role="menuitem"
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </section>

        {activeAdminTab === "dashboard" && (
          <>
            <section className="dashboardHeroCards">
              <div className="dashboardHeroCard primary">
                <div className="metricTop">
                  <span className="metricStatus ready">Hoje</span>
                </div>
                <span>Agendamentos de hoje</span>
                <strong>{todayAppointments.length}</strong>
                <small>{agendaStatus} - {activeTodayAppointments.length} ativos</small>
                <div className="miniBars" aria-hidden="true">
                  {dashboardBars.map((height, index) => (
                    <i key={index} style={{ height }} />
                  ))}
                </div>
              </div>

              <div className="dashboardHeroCard revenue">
                <div className="metricTop">
                  <span className="metricStatus success">Caixa</span>
                </div>
                <span>Faturamento do dia</span>
                <strong>{money(todayRevenue)}</strong>
                <small>{money(todayPaidRevenue)} recebido</small>
                <div className="metricProgress">
                  <span
                    style={{
                      width: `${todayRevenue ? Math.min(100, Math.round((todayPaidRevenue / todayRevenue) * 100)) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="dashboardHeroCard">
                <div className="metricTop">
                  <span className="metricStatus neutral">Atendimento</span>
                </div>
                <span>Clientes atendidos</span>
                <strong>{attendedToday}</strong>
                <small>{todayAppointments.length - attendedToday} ainda pendente(s)</small>
              </div>

              <div className="dashboardHeroCard next">
                <div className="metricTop">
                  <span className="metricStatus ready">Próximo</span>
                </div>
                <span>Próximo horário</span>
                <strong>{nextAppointment?.time || "--:--"}</strong>
                <small>{nextAppointment ? nextAppointment.clientName : "Nenhum horário na fila"}</small>
              </div>

              <div className="dashboardHeroCard service">
                <div className="metricTop">
                  <span className="metricStatus warning">Mais vendido</span>
                </div>
                <div className="serviceHeroBody">
                  <div className="serviceHeroTitle">
                    <span className="serviceHeroLabel">Serviço mais vendido</span>
                    <strong className={topServiceNameClass}>{topServiceName}</strong>
                  </div>
                  <small className="serviceHeroCount">
                    {topService ? `${topService[1]} pedido(s)` : "Aparece após agendamentos"}
                  </small>
                </div>
              </div>

              <div className="dashboardHeroCard occupancy">
                <div className="metricTop">
                  <span className="metricStatus neutral">Ocupação</span>
                </div>
                <span>Taxa de ocupação</span>
                <strong>{occupancyRate}%</strong>
                <small>{scheduledMinutes}min de {workingMinutes || 0}min úteis</small>
                <div className="occupancyRing" style={{ "--rate": `${occupancyRate}%` } as React.CSSProperties}>
                  <b>{occupancyRate}%</b>
                </div>
              </div>

              <div className="dashboardHeroCard">
                <div className="metricTop">
                  <span className="metricStatus ready">Mês</span>
                </div>
                <span>Clientes novos no mês</span>
                <strong>{newClientsThisMonth}</strong>
                <small>{currentMonthClients} cliente(s) ativos no mês</small>
              </div>

              <div className="dashboardHeroCard plan">
                <div className="metricTop">
                  <span className={`metricStatus ${business.monthlyStatus === "active" ? "success" : "warning"}`}>
                    {statusLabel}
                  </span>
                </div>
                <span>Plano atual</span>
                <strong>{planLabel}</strong>
                <small>Status da assinatura</small>
              </div>

              <div className="dashboardHeroCard billing">
                <div className="metricTop">
                  <span className="metricStatus neutral">Mensalidade</span>
                </div>
                <span>Vencimento do plano</span>
                <strong>{nextBillingLabel}</strong>
                <small>{statusLabel}</small>
              </div>
            </section>

            {canManageBusinessSettings && (
              <section className="setupAssistantCard">
                <div className="setupAssistantHeader">
                  <div>
                    <span>Assistente de configuração inicial</span>
                    <h2>Configuração {onboardingProgress}% concluída</h2>
                    <p>
                      Siga estes passos para deixar a barbearia pronta para receber clientes sem
                      depender de suporte.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => (nextOnboardingStep || visibleOnboardingSteps[0])?.action()}
                  >
                    {nextOnboardingStep ? nextOnboardingStep.buttonLabel : "Revisar configuração"}
                  </button>
                </div>

                <div className="setupAssistantProgress">
                  <span style={{ width: `${onboardingProgress}%` }} />
                </div>

                <div className="setupAssistantSteps">
                  {visibleOnboardingSteps.map((step, index) => {
                    const isCurrent = !step.done && step === nextOnboardingStep;

                    return (
                      <div
                        className={[
                          "setupAssistantStep",
                          step.done ? "done" : "",
                          isCurrent ? "current" : "",
                        ].join(" ")}
                        key={step.label}
                      >
                        <div className="setupStepIndex">{step.done ? "OK" : index + 1}</div>
                        <div className="setupStepContent">
                          <strong>{step.label}</strong>
                          <small>{step.description}</small>
                        </div>
                        <button type="button" onClick={step.action}>
                          {step.done ? "Revisar" : step.buttonLabel}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="setupAssistantFooter">
                  <span>
                    {completedOnboardingSteps}/{visibleOnboardingSteps.length} passos concluídos
                  </span>
                  <strong>
                    {nextOnboardingStep
                      ? `Próximo passo: ${nextOnboardingStep.label}`
                      : "Pronto para divulgar o link de agendamento"}
                  </strong>
                </div>
              </section>
            )}

            <section className="dashboardCommandCenter">
              <div className="dashboardMainCard">
                <span>Próximo atendimento</span>
                {nextAppointment ? (
                  <>
                    <strong>{nextAppointment.time} - {nextAppointment.clientName}</strong>
                    <p>{nextAppointment.services} com {nextAppointment.professional}</p>
                  </>
                ) : (
                  <>
                    <strong>Nenhum horário na fila</strong>
                    <p>Compartilhe o link de agendamento para receber novos clientes.</p>
                  </>
                )}
                <button type="button" onClick={() => setAdminTab("agenda")}>
                  Abrir agenda
                </button>
              </div>

              <div className="dashboardSideStack">
                <div>
                  <span>Configuração</span>
                  <strong>{setupProgress}%</strong>
                  <small>{firstPendingSetup?.label || "Pronto para vender"}</small>
                </div>
                <div>
                  <span>Estrutura ativa</span>
                  <strong>{activeServiceCount} serviços</strong>
                  <small>{activeProfessionalCount} profissionais atendendo</small>
                </div>
                <button type="button" onClick={() => copyText(publicScheduleLink)}>
                  Copiar link de agendamento
                </button>
                <a href={scheduleWhatsappShareLink} target="_blank" rel="noreferrer">
                  Divulgar no WhatsApp
                </a>
              </div>
            </section>

            <section className="card cashCloseCard">
              <div className="sectionTitle">
                <h2>Fechamento do dia</h2>
                <span>Resumo financeiro</span>
              </div>

              <div className="cashCloseGrid">
                <div>
                  <span>Faturamento do dia</span>
                  <strong>{money(todayRevenue)}</strong>
                  <small>{todayAppointments.length} agendamentos</small>
                </div>
                <div>
                  <span>Dinheiro</span>
                  <strong>{money(todayCashRevenue)}</strong>
                  <small>pagamentos marcados como dinheiro</small>
                </div>
                <div>
                  <span>PIX</span>
                  <strong>{money(todayPixRevenue)}</strong>
                  <small>pagamentos por PIX</small>
                </div>
                <div>
                  <span>Cartão</span>
                  <strong>{money(todayCardRevenue)}</strong>
                  <small>pagamentos por cartão</small>
                </div>
                <div>
                  <span>Pendente</span>
                  <strong>{money(todayPendingRevenue)}</strong>
                  <small>{todayPendingPaymentAppointments.length} aguardando pagamento</small>
                </div>
                <div>
                  <span>Descontos</span>
                  <strong>{money(todayDiscounts)}</strong>
                  <small>diferença registrada em promoções</small>
                </div>
                <div>
                  <span>Comissões</span>
                  <strong>{money(todayCommissionTotal)}</strong>
                  <small>{money(todayPendingCommissionTotal)} pendente</small>
                </div>
                <div>
                  <span>Recebido</span>
                  <strong>{money(todayPaidRevenue)}</strong>
                  <small>{todayPaidAppointments.length} marcados como pagos</small>
                </div>
                <div>
                  <span>Lucro estimado</span>
                  <strong>{money(estimatedDailyProfit)}</strong>
                  <small>recebido menos comissões pagas</small>
                </div>
              </div>

              <div className={commissionsAvailable ? "commissionReport" : "commissionReport lockedCommission"}>
                <div className="commissionReportHeader">
                  <div>
                    <span>Comissões por profissional</span>
                    <strong>Relatório Premium</strong>
                  </div>
                  <small>Valor pago / valor pendente</small>
                </div>

                {!commissionsAvailable && (
                  <p className="hint">Comissões por profissional são um recurso do plano Premium.</p>
                )}

                {commissionsAvailable && professionalCommissionReport.length === 0 && (
                  <p className="hint">Cadastre profissionais e percentuais para calcular comissões.</p>
                )}

                {commissionsAvailable && professionalCommissionReport.map((item) => (
                  <div className="commissionReportRow" key={item.name}>
                    <div>
                      <strong>{item.name}</strong>
                      <span>
                        {item.appointmentCount} atendimento(s) - {item.percent}% padrão
                      </span>
                    </div>
                    <div>
                      <small>Pago</small>
                      <b>{money(item.paidCommission)}</b>
                    </div>
                    <div>
                      <small>Pendente</small>
                      <b>{money(item.pendingCommission)}</b>
                    </div>
                  </div>
                ))}
              </div>

              <div className="cashCloseFooter">
                <p>
                  Use a agenda para marcar atendimentos como pagos e manter o caixa do dia atualizado.
                </p>
                <div className="cashCloseActions">
                  <button type="button" onClick={() => setAdminTab("agenda")}>
                    Conferir agenda
                  </button>
                  <button type="button" onClick={exportDailyCashPdf}>
                    Exportar relatório
                  </button>
                  <button type="button" onClick={closeToday}>Fechar dia</button>
                </div>
              </div>
            </section>

            <section className="card exportCard">
              <div className="sectionTitle">
                <h2>Exportar fechamento</h2>
                <span>Excel, TXT ou PDF</span>
              </div>

              <p className="hint">
                Baixe o resumo do caixa do dia no formato mais prático para conferir, enviar ou arquivar.
              </p>

              <div className="exportGrid">
                <button type="button" onClick={exportDailyCashCsv}>
                  Excel
                  <small>Abre em planilha</small>
                </button>
                <button type="button" onClick={exportDailyCashTxt}>
                  TXT
                  <small>Resumo simples</small>
                </button>
                <button type="button" onClick={exportDailyCashPdf}>
                  PDF
                  <small>Pronto para imprimir</small>
                </button>
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
                {canManageBusinessSettings && (
                  <>
                <button type="button" onClick={blockNextAvailableTime}>Bloquear próximo horário</button>
                <button type="button" onClick={closeToday}>Fechar hoje</button>
                <button type="button" onClick={openToday}>Liberar hoje</button>
                  </>
                )}
                {canUseAdminTab("services") && (
                  <>
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
                        setAdminTab("professionals");
                      }}
                    >
                  Novo profissional
                </button>
                  </>
                )}
                {canUseAdminTab("payments") && (
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
                )}
                <button type="button"
                  onClick={() => goToClientView()}
                >
                  Ver tela do cliente
                </button>
              </div>
            </section>

            <section className="card operationCard">
              <div className="sectionTitle">
                <h2>Operação comercial</h2>
                <span>{commercialReady ? "Pronta para cliente" : "Falta configuração"}</span>
              </div>

              <div className="operationStatus">
                <div className={commercialReady ? "operationBadge ready" : "operationBadge attention"}>
                  <strong>{commercialReady ? "Pronta para testar" : "Ajuste antes de vender"}</strong>
                  <span>
                    {commercialReady
                      ? "Serviços, profissionais, agenda, acesso e link público estão configurados."
                      : firstPendingSetup
                      ? `Primeira pendência: ${firstPendingSetup.label}.`
                      : "Revise os dados antes de enviar o link ao cliente."}
                  </span>
                </div>

                <div className="operationLinkBox">
                  <span>Link do cliente</span>
                  <strong>{publicScheduleLink}</strong>
                  <div className="operationActions">
                    <button type="button" onClick={() => copyText(publicScheduleLink)}>
                      Copiar link
                    </button>
                    <button type="button" onClick={goToClientView}>
                      Abrir agenda
                    </button>
                    <a href={scheduleWhatsappShareLink} target="_blank" rel="noreferrer">
                      Enviar no WhatsApp
                    </a>
                    <button type="button" onClick={() => copyText(scheduleBioText)}>
                      Copiar texto da bio
                    </button>
                  </div>
                </div>
              </div>

              <div className="shareGuideBox">
                <div>
                  <span>Mensagem pronta</span>
                  <strong>Use este texto para Instagram, status ou grupos.</strong>
                  <p>{scheduleBioText}</p>
                </div>
                <button type="button" onClick={() => copyText(scheduleBioText)}>
                  Copiar divulgação
                </button>
              </div>

              <div className="operationChecklist">
                <div>
                  <span>Nuvem</span>
                  <strong>{cloudStatus}</strong>
                </div>
                <div>
                  <span>Configuração</span>
                  <strong>{completedSetupItems}/{setupItems.length} itens</strong>
                </div>
                <div>
                  <span>Próxima ação</span>
                  <strong>{firstPendingSetup?.label || "Teste o agendamento público"}</strong>
                </div>
              </div>

              {firstPendingSetup && (
                <button
                  type="button"
                  className="black"
                  onClick={() => setAdminTab(firstPendingSetup.tab)}
                >
                  Resolver {firstPendingSetup.label}
                </button>
              )}
            </section>

            {canUseAdminTab("improvements") && (
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
                      feature.state.enabled && feature.planAllowed !== false ? "resourceEnabled" : "",
                      feature.planAllowed === false ? "planBlockedResource" : "",
                    ].join(" ")}
                    key={feature.key}
                    onClick={() => {
                      if (
                        feature.planAllowed !== false &&
                        feature.state.released &&
                        !feature.shortcut.disabled &&
                        feature.shortcut.tab
                      ) {
                        setAdminTab(feature.shortcut.tab);
                      } else {
                        setAdminTab("improvements");
                      }
                    }}
                  >
                    <span>{feature.statusLabel}</span>
                    <strong>{feature.title}</strong>
                    <small>
                      {feature.planAllowed === false
                        ? "Ver plano em Melhorias"
                        : feature.state.released && !feature.shortcut.disabled
                        ? feature.shortcut.label
                        : "Gerenciar em Melhorias"}
                    </small>
                  </button>
                ))}
              </div>
            </section>
            )}

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
                <div>
                  <span>WhatsApp automático</span>
                  <strong>{whatsappIntegrationStatus.message}</strong>
                  <small>{whatsappIntegrationStatus.providerLabel}</small>
                </div>
              </div>

              {!whatsappIntegrationStatus.ready && (
                <p className="hint">
                  Enquanto a integração profissional não estiver completa, o cliente recebe um botão
                  para enviar a confirmação manualmente pelo WhatsApp.
                </p>
              )}

              <button type="button" className="outline" onClick={refreshWhatsappIntegrationStatus}>
                Verificar integração do WhatsApp
              </button>

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

        <CustomersPanel model={model} />

        <AgendaTodayPanel model={model} />

        <AgendaPanel model={model} />

        <ServicesPanel model={model} />

        <ProfessionalsPanel model={model} />

        <PaymentsPanel model={model} />

        <ImprovementsPanel model={model} />

        <AccountPanel model={model} />

        <AppearancePanel model={model} />
      </main>
    );
}
