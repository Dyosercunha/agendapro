// @ts-nocheck
import React from "react";
import AgendaPanel from "./AgendaPanel";
import AccountPanel from "./AccountPanel";
import AppearancePanel from "./AppearancePanel";
import CustomersPanel from "./CustomersPanel";
import ImprovementsPanel from "./ImprovementsPanel";
import PaymentsPanel from "./PaymentsPanel";
import ProfessionalsPanel from "./ProfessionalsPanel";
import ServicesPanel from "./ServicesPanel";

export default function BarberDashboard({ model }) {
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
                {setupItems.filter((item) => canUseAdminTab(item.tab)).map((item) => (
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
