// @ts-nocheck
import React from "react";
import AgendaPanel from "./AgendaPanel";
import AppearancePanel from "./AppearancePanel";
import ServicesPanel from "./ServicesPanel";

export default function BarberDashboard({ model }) {
  const {
    accessAccounts,
    accessEditorKey,
    activeAdminTab,
    activeFeatureCount,
    addAccessAccount,
    addProfessional,
    addService,
    adminLoggedIn,
    adminPanelLink,
    adminTabs,
    agendaStatus,
    autoConfirmationFeatureEnabled,
    blockNextAvailableTime,
    business,
    canManageAccessAccounts,
    canManageBilling,
    canManageBusinessSettings,
    canUseAdminTab,
    clampPercentage,
    clientName,
    closeToday,
    cloudSaving,
    cloudStatus,
    completedSetupItems,
    copyText,
    currentAdminRole,
    currentPlan,
    customerProfiles,
    dataSavedAt,
    featureFlags,
    featureShortcut,
    featureStatusCards,
    formatDate,
    formatDateOnly,
    goToClientView,
    isDeveloperRole,
    isFutureOnlyFeature,
    isUuid,
    logoutAdmin,
    loyaltyFeatureEnabled,
    money,
    normalizeRole,
    openToday,
    passwordEditorOpen,
    pixAvailable,
    pixDiscount,
    planOptions,
    platformFeatures,
    professional,
    professionals,
    promotionAvailable,
    promotionDiscount,
    publicScheduleLink,
    removeAccessAccount,
    removeProfessional,
    resetDemoData,
    returningCustomers,
    saveAccessAccountsToCloud,
    saveBusinessToCloud,
    saveFeatureFlagsToCloud,
    saveProfessionalsToCloud,
    services,
    setAccessPasswordEditor,
    setAdminTab,
    setBusiness,
    setFeatureRelease,
    setupItems,
    setupProgress,
    setViewMode,
    todayAppointments,
    todayRevenue,
    topCustomer,
    upcomingAppointments,
    updateAccessAccount,
    updateBusinessSlug,
    updateFeatureFlag,
    updateProfessional,
    visibleAdminTabs,
    waitlist,
    whatsapp,
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

        <section className={activeAdminTab === "customers" ? "card customerCard" : "hiddenPanel"}>
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
            {!loyaltyFeatureEnabled && canUseAdminTab("improvements") && (
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

        <AgendaPanel model={model} />

        <ServicesPanel model={model} />

        <section className={activeAdminTab === "professionals" ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "payments" ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "improvements" ? "card" : "hiddenPanel"}>
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
                  {currentAdminRole === "desenvolvedor" ? (
                    <button type="button"
                      onClick={() => setFeatureRelease(feature.key, !featureState.released)}
                    >
                      {featureState.released ? "Bloquear recurso" : "Liberar recurso"}
                    </button>
                  ) : (
                    <button type="button" disabled>
                      {featureState.released ? "Liberado pela plataforma" : "Bloqueado pela plataforma"}
                    </button>
                  )}

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

        <section className={activeAdminTab === "account" ? "card accountCard" : "hiddenPanel"}>
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

          <label>E-mail responsável</label>
          <input
            type="email"
            value={business.ownerEmail || ""}
            disabled={!isDeveloperRole}
            onChange={(event) => setBusiness({ ...business, ownerEmail: event.target.value })}
          />

          <label>Identificador do link</label>
          <input
            value={business.slug || ""}
            disabled={!isDeveloperRole}
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
            {canManageAccessAccounts && (
              <button type="button" onClick={addAccessAccount}>Adicionar</button>
            )}
          </div>

          <div className="accessList">
            {accessAccounts.map((account, index) => {
              const editorKey = accessEditorKey(account, index);
              const needsInitialPassword = !account.fixed && !isUuid(account.id);
              const isPasswordOpen = Boolean(passwordEditorOpen[editorKey]) || needsInitialPassword;
              const passwordLabel = needsInitialPassword
                ? "Senha inicial deste acesso"
                : "Nova senha deste acesso";

              return (
                <div className="accessItem" key={account.id || index}>
                  <label>E-mail de acesso</label>
                  <input
                    type="email"
                    value={account.email}
                    disabled={account.fixed}
                    placeholder="funcionario@barbearia.com"
                    onChange={(event) => updateAccessAccount(index, "email", event.target.value)}
                  />

                  {!needsInitialPassword && (
                    <div className="accessPasswordActions">
                      <button
                        type="button"
                        className="outline"
                        onClick={() => setAccessPasswordEditor(index, account, !isPasswordOpen)}
                      >
                        {isPasswordOpen ? "Cancelar alteração de senha" : "Alterar senha deste e-mail"}
                      </button>
                    </div>
                  )}

                  {isPasswordOpen && (
                    <div className="accessPasswordBox">
                      <label>{passwordLabel}</label>
                      <input
                        type="password"
                        value={account.password || ""}
                        placeholder="mínimo 6 caracteres"
                        onChange={(event) => updateAccessAccount(index, "password", event.target.value)}
                      />

                      <label>Confirmar senha</label>
                      <input
                        type="password"
                        value={account.passwordConfirm || ""}
                        placeholder="repita a senha"
                        onChange={(event) =>
                          updateAccessAccount(index, "passwordConfirm", event.target.value)
                        }
                      />

                      <p className="hint">
                        Esta senha será aplicada somente ao e-mail {account.email || "deste acesso"} ao
                        salvar os acessos.
                      </p>
                    </div>
                  )}

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
                        {(isDeveloperRole || normalizeRole(account.role) === "desenvolvedor") && (
                          <option value="Desenvolvedor">Desenvolvedor</option>
                        )}
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
              );
            })}
          </div>

          {canManageAccessAccounts && (
            <button type="button" className="green" onClick={saveAccessAccountsToCloud}>
              {cloudSaving === "access" ? "Salvando acessos..." : "Salvar acessos"}
            </button>
          )}

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

        <AppearancePanel model={model} />
      </main>
    );
}
