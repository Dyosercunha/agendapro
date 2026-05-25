import React from "react";
import type { AdminTabId } from "../../lib/permissions";
import type { Appointment, FeatureDefinition, FeatureFlag } from "../../types/app";
import AgendaPanel from "./panels/AgendaPanel";
import AccountPanel from "./panels/AccountPanel";
import AppearancePanel from "./panels/AppearancePanel";
import CustomersPanel from "./panels/CustomersPanel";
import ImprovementsPanel from "./panels/ImprovementsPanel";
import PaymentsPanel from "./panels/PaymentsPanel";
import ProfessionalsPanel from "./panels/ProfessionalsPanel";
import ServicesPanel from "./panels/ServicesPanel";
import type { AccountPanelModel } from "./panels/AccountPanel";
import type { AgendaPanelModel } from "./panels/AgendaPanel";
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

type FeatureStatusCard = FeatureDefinition & {
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
    blockNextAvailableTime,
    business,
    canManageBilling,
    canManageBusinessSettings,
    canUseAdminTab,
    clientName,
    closeToday,
    cloudStatus,
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
    returningCustomers,
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
    waitlist,
    whatsappIntegrationStatus,
    withNotice,
  } = model;
  const visibleSetupItems = setupItems.filter((item) => canUseAdminTab(item.tab));
  const firstPendingSetup = visibleSetupItems.find((item) => !item.done);
  const commercialReady = setupProgress >= 100 && !firstPendingSetup;

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
          {visibleAdminTabs.map((tab) => (
            <button type="button"
              key={tab.id}
              className={activeAdminTab === tab.id ? "activeAdminTab" : ""}
              onClick={() => setAdminTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {activeAdminTab === "dashboard" && (
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
                  </div>
                </div>
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

            {canManageBusinessSettings && (
            <section className="card setupCard">
              <div className="sectionTitle">
                <h2>Checklist do app</h2>
                <span>{completedSetupItems}/{setupItems.length} pronto</span>
              </div>

              <div className="setupProgress">
                <span style={{ width: `${setupProgress}%` }} />
              </div>

              <div className="setupList">
                {visibleSetupItems.map((item) => (
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
            )}

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
