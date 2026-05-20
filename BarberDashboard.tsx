// @ts-nocheck
import React from "react";

export default function BarberDashboard({ model }) {
  const {
    accessAccounts,
    accessEditorKey,
    activeAdminTab,
    activeFeatureCount,
    activeServices,
    addAccessAccount,
    addBlock,
    addBreak,
    addDayOff,
    addProfessional,
    addService,
    adminContext,
    adminEmail,
    adminLoggedIn,
    adminLoginError,
    adminPanelLink,
    adminPassword,
    adminTab,
    adminTabs,
    agendaStatus,
    App,
    appointmentBlocksSlot,
    appointmentConflict,
    appointmentManagementLink,
    appointmentNote,
    appointmentProfessionalMatches,
    appointments,
    appOrigin,
    AppProFeatures,
    autoConfirmationFeatureEnabled,
    barberConfirmationMessage,
    barberGateError,
    barberGateName,
    barberGateWhatsapp,
    barbershopId,
    baseReason,
    blockConflict,
    blockNextAvailableTime,
    buildBarberConfirmationMessage,
    buildSlotsForDate,
    business,
    callCloudFunction,
    canAccessAdminTab,
    cancelAppointment,
    canContinue,
    canManageAccessAccounts,
    canManageBilling,
    canManageBusinessSettings,
    canUseAdminTab,
    chosenServices,
    clampPercentage,
    cleanWhatsapp,
    clientHistory,
    clientName,
    clientProfessionals,
    closeNotice,
    closeToday,
    cloudErrorText,
    cloudHistory,
    cloudLoadState,
    cloudRoleFromLabel,
    cloudSaving,
    cloudSlug,
    cloudStatus,
    completedSetupItems,
    confirmAppointmentPayment,
    confirmationSent,
    confirmedId,
    confirmedToken,
    copyText,
    currentAdminAccount,
    currentAdminRole,
    currentPlan,
    currentSlot,
    currentSlugFromUrl,
    customerProfiles,
    dataSavedAt,
    dateCount,
    dateOptions,
    dateParts,
    enterAdminWithEmail,
    fallbackProfessionalName,
    featureFlags,
    featureShortcut,
    featureStatusCards,
    findAvailableProfessional,
    finishSchedule,
    formatDate,
    formatDateForMessage,
    formatDateOnly,
    formatPhone,
    getDateAfterDays,
    getDateAvailability,
    getWorkingDay,
    goCheckout,
    goToClientView,
    handleAuthSession,
    handleBackgroundUpload,
    handleClearLocalCache,
    handleLogoUpload,
    hasChosenService,
    hexToRgba,
    history,
    initialAccessAccounts,
    initialAppointments,
    initialBusiness,
    initialFeatureFlags,
    initialProfessionals,
    initialSchedule,
    initialServices,
    initialViewModeFromUrl,
    initialWaitlist,
    intervalOverlaps,
    isAdminEmailAllowed,
    isDayOff,
    isDeveloperRole,
    isFutureOnlyFeature,
    isOwnerEmail,
    isOwnerRole,
    isPlainObject,
    isPlatformAdminSession,
    isServiceDeleted,
    isUuid,
    joinWaitlist,
    loadCloudData,
    loadedCloudSlug,
    loadPublicAppointment,
    loginAdmin,
    loginWithGoogle,
    logoutAdmin,
    loyaltyFeatureEnabled,
    makeId,
    makeSlug,
    mapAccessAccountsFromCloud,
    mapAppointmentsFromCloud,
    mapBusinessFromCloud,
    mapFeatureFlagsFromCloud,
    mapPublicAppointment,
    mapScheduleFromCloud,
    mapServicesFromCloud,
    mapWaitlistFromCloud,
    markDataSaved,
    mergeWithDefault,
    minutesToTime,
    missingLoadedBarbershopResult,
    money,
    nameMatchesBusiness,
    nextTodaySlot,
    normalizeAccessText,
    normalizeBookingResponse,
    normalizeBusiness,
    normalizedAdminEmail,
    normalizedOwnerEmail,
    normalizeRole,
    notice,
    openAdminArea,
    openToday,
    pad,
    passwordEditorOpen,
    passwordForm,
    passwordMessage,
    passwordSaving,
    payment,
    phoneMatchesBusiness,
    pixAvailable,
    pixDiscount,
    pixDiscountValue,
    pixFeatureEnabled,
    pixPrice,
    planOptions,
    platformDeveloperEmail,
    platformFeatures,
    professional,
    professionalAvailable,
    professionals,
    promotionalTotal,
    promotionAvailable,
    promotionDiscount,
    promotionValue,
    publicActionSaving,
    publicAppointment,
    publicAppointmentToken,
    publicScheduleLink,
    range,
    rangesOverlap,
    React,
    readSavedData,
    realProfessionals,
    recommendedTime,
    refreshCloudAppointments,
    removeAccessAccount,
    removeBlock,
    removeBreak,
    removeDayOff,
    removeProfessional,
    removeSavedData,
    removeService,
    repairText,
    repeatLastService,
    requireLoadedBarbershop,
    rescheduleAppointment,
    resetDemoData,
    returningCustomers,
    roleLabel,
    roundCurrency,
    routeSlug,
    runCloudSave,
    safeImageUrl,
    saveAccessAccountsToCloud,
    saveAppointmentToCloud,
    saveBackgroundsToCloud,
    saveBusinessToCloud,
    saveData,
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
    sendBarberConfirmation,
    services,
    servicesText,
    setAccessAccounts,
    setAccessPasswordEditor,
    setAdminContext,
    setAdminEmail,
    setAdminLoggedIn,
    setAdminLoginError,
    setAdminPassword,
    setAdminTab,
    setAppointmentNote,
    setAppointments,
    setBarberConfirmationMessage,
    setBarberGateError,
    setBarberGateName,
    setBarberGateWhatsapp,
    setBarbershopId,
    setBusiness,
    setClientName,
    setCloudHistory,
    setCloudLoadState,
    setCloudSaving,
    setCloudSlug,
    setCloudStatus,
    setConfirmationSent,
    setConfirmedId,
    setConfirmedToken,
    setDataSavedAt,
    setFeatureFlags,
    setFeatureRelease,
    setNotice,
    setPasswordEditorOpen,
    setPasswordForm,
    setPasswordMessage,
    setPasswordSaving,
    setPayment,
    setProfessional,
    setProfessionals,
    setPublicActionSaving,
    setPublicAppointment,
    setPublicAppointmentToken,
    setRange,
    setRawCloudSaving,
    setSchedule,
    setScreen,
    setSelectedDate,
    setSelectedServices,
    setSelectedTime,
    setServices,
    setupItems,
    setupProgress,
    setViewMode,
    setWaitlist,
    setWaitlistSent,
    setWhatsapp,
    shortTime,
    shouldFallbackToLegacyBooking,
    showNotice,
    showProfessionalChoice,
    slots,
    slugFromPathname,
    startNewSchedule,
    storageKey,
    storageKeys,
    storagePrefix,
    supabase,
    supabaseAnonKey,
    supabaseUrl,
    syncAccessAuthUsers,
    syncAppointmentAction,
    timeToMinutes,
    toDate,
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
    updateOwnPassword,
    updateProfessional,
    updatePublicAppointment,
    updateService,
    updateWaitlistStatus,
    updateWorkingDay,
    useEffect,
    useMemo,
    useState,
    verifyBarberIdentity,
    viewMode,
    visibleAdminTabs,
    waitlist,
    waitlistAvailable,
    waitlistSent,
    weekDays,
    weekMap,
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "services" ? "card" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "appearance" ? "card" : "hiddenPanel"}>
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
            <label>Subir imagem de fundo do cliente</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleBackgroundUpload("clientBackgroundUrl", event)}
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
            <label>Subir imagem de fundo do painel</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleBackgroundUpload("adminBackgroundUrl", event)}
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

            <button type="button" className="black" onClick={saveBackgroundsToCloud}>
              {cloudSaving === "backgrounds" ? "Salvando fundos..." : "Salvar planos de fundo"}
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

        <section className={activeAdminTab === "agenda" ? "card" : "hiddenPanel"}>
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
              {appointment.note && <p>Observação: {appointment.note}</p>}
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

        <section className={activeAdminTab === "agenda" ? "card" : "hiddenPanel"}>
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
