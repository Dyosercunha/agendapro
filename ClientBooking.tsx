// @ts-nocheck
import React from "react";

export default function ClientBooking({ model }) {
  const {
    activeServices,
    activePromotions,
    appointmentManagementLink,
    appointmentNote,
    barberConfirmationMessage,
    business,
    canContinue,
    chosenServices,
    clientName,
    clientProfessionals,
    cloudSaving,
    confirmationSent,
    copyText,
    dateOptions,
    dateParts,
    finishSchedule,
    formatDate,
    formatDateForMessage,
    formatPhone,
    getDateAvailability,
    goCheckout,
    hasChosenService,
    history,
    joinWaitlist,
    money,
    openAdminArea,
    payment,
    pixAvailable,
    pixDiscount,
    pixDiscountValue,
    pixPrice,
    professional,
    promotionalTotal,
    promotionAvailable,
    promotionDetails,
    promotionValue,
    promotionsOpen,
    publicActionSaving,
    publicAppointment,
    range,
    recommendedTime,
    repairText,
    repeatLastService,
    schedule,
    scheduleBlocked,
    screen,
    selectedDate,
    selectedPaymentTotal,
    selectedPromotionDetails,
    selectedPromotions,
    selectedServices,
    selectedTime,
    services,
    servicesText,
    setAppointmentNote,
    setClientName,
    setPayment,
    setProfessional,
    setPromotionsOpen,
    setRange,
    setScreen,
    setSelectedDate,
    setSelectedTime,
    setWhatsapp,
    showProfessionalChoice,
    slots,
    startNewSchedule,
    today,
    toggleService,
    togglePromotion,
    totalDuration,
    totalPrice,
    updatePublicAppointment,
    waitlistAvailable,
    waitlistSent,
    whatsapp,
    withNotice,
  } = model;

  if (screen === "manage") {
    return withNotice(
      <main className="app">
        <section className="card success">
          <div className="badge">Agendamento</div>
          <h1>Gerenciar horário</h1>
          {publicActionSaving === "load" && <p>Carregando dados do agendamento...</p>}

          {!publicActionSaving && !publicAppointment && (
            <>
              <p>Não encontramos um agendamento ativo para este link.</p>
              <a
                className="black linkButton"
                href={`https://wa.me/${business.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a barbearia
              </a>
            </>
          )}

          {publicAppointment && (
            <>
              <p>
                <strong>{formatDate(publicAppointment.date)} às {publicAppointment.time}</strong>
              </p>
              <p>{publicAppointment.services}</p>
              <p>Profissional: {publicAppointment.professional}</p>
              <p>Status: {publicAppointment.status === "cancelled" ? "Cancelado" : "Confirmado"}</p>
              {publicAppointment.rescheduleRequested && (
                <p className="rescheduleNotice">Remarcação solicitada para a barbearia.</p>
              )}

              <button
                type="button"
                className="black"
                disabled={publicActionSaving === "reschedule" || publicAppointment.status === "cancelled"}
                onClick={() => updatePublicAppointment("reschedule")}
              >
                {publicActionSaving === "reschedule" ? "Enviando..." : "Solicitar remarcação"}
              </button>

              <button
                type="button"
                className="dangerAction fullButton"
                disabled={publicActionSaving === "cancel" || publicAppointment.status === "cancelled"}
                onClick={() => updatePublicAppointment("cancel")}
              >
                {publicActionSaving === "cancel" ? "Cancelando..." : "Cancelar agendamento"}
              </button>

              <a
                className="outline linkButton"
                href={`https://wa.me/${business.whatsapp}?text=${encodeURIComponent(
                  `Olá! Preciso falar sobre meu agendamento de ${formatDateForMessage(
                    publicAppointment.date
                  )} às ${publicAppointment.time}.`
                )}`}
                target="_blank"
                rel="noreferrer"
              >
                Falar com a barbearia
              </a>
            </>
          )}

          <button type="button" className="outline" onClick={startNewSchedule}>
            Novo agendamento
          </button>
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
          {appointmentManagementLink && (
            <a
              className="outline linkButton"
              href={appointmentManagementLink}
              target="_blank"
              rel="noreferrer"
            >
              Abrir link do meu agendamento
            </a>
          )}
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
          {chosenServices.length > 0 && (
            <>
              <h3>Serviços</h3>
              {chosenServices.map((service) => (
                <p key={service.name}>{service.name}</p>
              ))}
            </>
          )}
          {selectedPromotionDetails.length > 0 && (
            <>
              <h3>Promoções</h3>
              {selectedPromotionDetails.map((promotion) => (
                <p key={promotion.id}>{promotion.title}</p>
              ))}
            </>
          )}
          <div className="priceBreakdown">
            <div className="summaryLine">
              <span>Subtotal</span>
              <strong>{money(totalPrice)}</strong>
            </div>

            {promotionAvailable &&
              promotionDetails
                .filter((promotion) => promotion.selected && promotion.savings > 0)
                .map((promotion) => (
                  <div className="summaryLine promoLine" key={promotion.id}>
                    <span>{promotion.title || "Promoção"}</span>
                    <strong>-{money(promotion.savings)}</strong>
                  </div>
                ))}

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

          <label>Observação para a barbearia</label>
          <textarea
            value={appointmentNote}
            onChange={(event) => setAppointmentNote(event.target.value)}
            placeholder="Exemplo: corte mais baixo nas laterais, preferência de atendimento ou aviso importante."
          />
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
        <span className={!hasChosenService ? "activeStep" : ""}>1 Serviços</span>
        <span className={hasChosenService && selectedTime === "" ? "activeStep" : ""}>
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

      {promotionAvailable && activePromotions.length > 0 && (
        <section className="promoBanner promoListBanner">
          <div>
            <span>Promoções disponíveis</span>
            <strong>
              {promotionValue > 0
                ? `Você economiza ${money(promotionValue)}`
                : `${activePromotions.length} promoção disponível`}
            </strong>
            <small>Abra para ver as condições ativas desta barbearia.</small>
          </div>
          <button
            type="button"
            className="promoToggle"
            onClick={() => setPromotionsOpen(!promotionsOpen)}
          >
            {promotionsOpen ? "Ocultar" : "Ver promos"}
          </button>

          {promotionsOpen && (
            <div className="clientPromoList">
              {promotionDetails.map((promotion) => (
                <div
                  className={
                    selectedPromotions.includes(promotion.id)
                      ? "clientPromoItem selectedPromoItem"
                      : "clientPromoItem"
                  }
                  key={promotion.id}
                >
                  <div>
                    <strong>{promotion.title || "Promoção"}</strong>
                    {promotion.description && <p>{promotion.description}</p>}
                    <span>
                      {promotion.type === "price"
                        ? `Valor promocional: ${money(promotion.promotionalPrice || 0)}`
                        : [
                            promotion.discountPercent > 0 ? `${promotion.discountPercent}%` : "",
                            promotion.discountValue > 0 ? `${money(promotion.discountValue)}` : "",
                          ]
                            .filter(Boolean)
                            .join(" + ")}
                      {promotion.savings > 0 && ` de economia neste agendamento`}
                    </span>
                  </div>
                  <button type="button" onClick={() => togglePromotion(promotion.id)}>
                    {selectedPromotions.includes(promotion.id) ? "Remover" : "Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {hasChosenService && (
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
            {waitlistAvailable && hasChosenService && (
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
            <span>Promoções</span>
            <strong>-{money(promotionValue)}</strong>
          </div>
        )}
        <div className="summaryLine">
          <span>Total</span>
          <strong className="bottomTotal">{hasChosenService ? money(promotionalTotal) : "A definir"}</strong>
        </div>
        <button type="button" className={canContinue ? "green" : "green disabled"} onClick={goCheckout}>
          {hasChosenService ? "Continuar →" : "Escolha serviço ou promo"}
        </button>
      </section>
    </main>
  );
}
