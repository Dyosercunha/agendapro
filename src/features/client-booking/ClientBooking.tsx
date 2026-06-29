import React from "react";
import type {
  Appointment,
  Barbershop,
  FeatureFlags,
  PaymentMode,
  Professional,
  Promotion,
  Service,
} from "../../types/app";
import { whatsappUrl } from "../../lib/phone";

type ActiveService = Service & {
  originalIndex: number;
};

type PromotionDetail = Promotion & {
  discountPercent: number;
  discountValue: number;
  id: string;
  promotionalPrice: number;
  savings: number;
  selected: boolean;
  title: string;
};

type ClientHistory = {
  lastServiceText?: string;
  lastServices: number[];
  name: string;
};

type DateInfo = {
  day: string;
  month: string;
  weekday: string;
};

type DateAvailability = {
  available: boolean;
  label: string;
};

type ScheduleSlot = {
  available: boolean;
  label: string;
  professional?: string;
  status: string;
  time: string;
};

type ClientProfessional = Pick<Professional, "name" | "photoUrl">;

type ClientSchedule = {
  slotInterval: number;
};

type PortfolioImage = {
  label: string;
  url?: string;
};

const agendaProLogoUrl = "/agenda-pro-logo.png";

type PublicAppointment = Appointment & {
  rescheduleRequested?: boolean;
};

type ClientBookingModel = {
  activePromotions: Promotion[];
  activeServices: ActiveService[];
  appointmentManagementLink: string;
  appointmentNote: string;
  barberConfirmationMessage: string;
  business: Barbershop;
  canContinue: boolean;
  chosenServices: Service[];
  clientGoogleAvailable: boolean;
  clientGoogleAvatarUrl: string;
  clientGoogleEmail: string;
  clientGoogleLoading: boolean;
  clientGoogleLoggedIn: boolean;
  clientGoogleMessage: string;
  clientGoogleName: string;
  clientName: string;
  clientProfessionals: ClientProfessional[];
  cloudSaving: string;
  confirmationSent: boolean;
  copyText: (text?: string) => void;
  dateOptions: string[];
  dateParts: (date: string) => DateInfo;
  featureFlags: FeatureFlags;
  finishSchedule: () => void;
  formatDate: (date?: string) => string;
  formatDateForMessage: (date?: string) => string;
  formatPhone: (value: string) => string;
  getDateAvailability: (date: string) => DateAvailability;
  goCheckout: () => void;
  hasChosenService: boolean;
  history?: ClientHistory | null;
  joinWaitlist: () => void;
  loginClientWithGoogle: () => void;
  logoutClientGoogle: () => void;
  money: (value?: number) => string;
  openAdminArea: () => void;
  payment: PaymentMode;
  pixAvailable: boolean;
  pixDiscount: number;
  pixDiscountValue: number;
  pixPrice: number;
  professional: string;
  promotionalTotal: number;
  promotionAvailable: boolean;
  promotionDetails: PromotionDetail[];
  promotionValue: number;
  promotionsOpen: boolean;
  publicActionSaving: string;
  publicAppointment?: PublicAppointment | null;
  range: string;
  recommendedTime: string;
  repairText: (value?: string) => string;
  repeatLastService: () => void;
  schedule: ClientSchedule;
  scheduleBlocked: boolean;
  screen: "home" | "confirm" | "success" | "manage" | string;
  selectedDate: string;
  selectedPaymentTotal: number;
  selectedPromotionDetails: PromotionDetail[];
  selectedPromotions: string[];
  selectedServices: number[];
  selectedTime: string;
  services: Service[];
  servicesText: string;
  setAppointmentNote: (value: string) => void;
  setClientName: (value: string) => void;
  setPayment: (value: PaymentMode) => void;
  setProfessional: (value: string) => void;
  setPromotionsOpen: (value: boolean) => void;
  setRange: (value: string) => void;
  setScreen: (value: string) => void;
  setSelectedDate: (value: string) => void;
  setSelectedTime: (value: string) => void;
  setWhatsapp: (value: string) => void;
  showProfessionalChoice: boolean;
  slots: ScheduleSlot[];
  startNewSchedule: () => void;
  today: string;
  togglePromotion: (promotionId: string) => void;
  toggleService: (serviceIndex: number) => void;
  totalDuration: number;
  totalPrice: number;
  updatePublicAppointment: (action: "reschedule" | "cancel") => void;
  waitlistAvailable: boolean;
  waitlistSent: boolean;
  whatsapp: string;
  withNotice: (content: React.ReactNode) => React.ReactNode;
};

type ClientBookingProps = {
  model: ClientBookingModel;
};

export default function ClientBooking({ model }: ClientBookingProps) {
  const {
    activeServices,
    activePromotions,
    appointmentManagementLink,
    appointmentNote,
    barberConfirmationMessage,
    business,
    canContinue,
    chosenServices,
    clientGoogleAvailable,
    clientGoogleAvatarUrl,
    clientGoogleEmail,
    clientGoogleLoading,
    clientGoogleLoggedIn,
    clientGoogleMessage,
    clientGoogleName,
    clientName,
    clientProfessionals,
    cloudSaving,
    confirmationSent,
    copyText,
    dateOptions,
    dateParts,
    featureFlags,
    finishSchedule,
    formatDate,
    formatDateForMessage,
    formatPhone,
    getDateAvailability,
    goCheckout,
    hasChosenService,
    history,
    joinWaitlist,
    loginClientWithGoogle,
    logoutClientGoogle,
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
  const clientThemeClass =
    business.themeMode === "light" ? " businessThemeLight clientThemeLight" : "";

  const cleanAddress = repairText(business.address || "");
  const rawMapsUrl = String(business.mapsUrl || "").trim();
  const hasSpecificMapsUrl =
    rawMapsUrl &&
    !/^https?:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)\/?$/i.test(rawMapsUrl);
  const mapsHref =
    hasSpecificMapsUrl
      ? rawMapsUrl
      : cleanAddress
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`
        : "";
  function googleCalendarDate(dateText: string, timeText: string, addMinutes = 0) {
    if (!dateText || !timeText) return "";

    const [year, month, day] = dateText.split("-").map(Number);
    const [hour, minute] = timeText.split(":").map(Number);
    const date = new Date(year, month - 1, day, hour, minute + addMinutes, 0);
    const pad = (value: number) => String(value).padStart(2, "0");

    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(
      date.getHours()
    )}${pad(date.getMinutes())}00`;
  }
  const calendarStart = googleCalendarDate(selectedDate, selectedTime);
  const calendarEnd = googleCalendarDate(
    selectedDate,
    selectedTime,
    totalDuration || schedule.slotInterval || 30
  );
  const addToCalendarHref =
    calendarStart && calendarEnd
      ? `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
          `${servicesText || "Atendimento"} - ${repairText(business.name)}`
        )}&dates=${calendarStart}/${calendarEnd}&details=${encodeURIComponent(
          `Agendamento em ${repairText(business.name)}. Profissional: ${professional}.`
        )}&location=${encodeURIComponent(cleanAddress)}`
      : "";
  const successPaymentLabel =
    payment === "pix" && pixAvailable
      ? `PIX antecipado - ${money(selectedPaymentTotal || pixPrice)}`
      : `Pagar no local - ${money(selectedPaymentTotal || totalPrice)}`;
  const instagramAvailable =
    Boolean(business.instagramUrl) &&
    Boolean(
      business.proInstagramEnabled ||
        (featureFlags?.instagram_booking?.released && featureFlags?.instagram_booking?.enabled)
    );
  const instagramHref =
    business.instagramUrl && /^https?:\/\//i.test(String(business.instagramUrl))
      ? business.instagramUrl
      : business.instagramUrl
        ? `https://${business.instagramUrl}`
        : "";
  const mediaAvailable = Boolean(
    business.proAppearanceMediaEnabled ||
      (featureFlags?.appearance_media?.released && featureFlags?.appearance_media?.enabled)
  );
  const portfolioImages: PortfolioImage[] = mediaAvailable
    ? [
        { url: business.beforeImageUrl, label: repairText(business.beforeImageLabel || "Antes") },
        { url: business.processImageUrl, label: repairText(business.processImageLabel || "Processo") },
        { url: business.finalImageUrl, label: repairText(business.finalImageLabel || "Final") },
      ].filter((item) => item.url)
    : [];
  const statusNotice =
    business.monthlyStatus === "overdue"
      ? "Esta barbearia está com a assinatura em regularização. Se algum horário não aparecer, fale diretamente pelo WhatsApp."
      : business.monthlyStatus === "trial"
        ? "Agenda em período de teste. Os horários podem ser ajustados pela barbearia a qualquer momento."
        : "";
  const coverImageUrl = String(business.clientBackgroundUrl || "").trim();
  const coverStyle = coverImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(7,10,13,0.2), rgba(7,10,13,0.88)), url(${coverImageUrl})`,
      }
    : undefined;
  const ratingValue = Number(business.ratingValue || 5).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const ratingText = repairText(
    business.ratingText || "Avaliação informada pela barbearia"
  );
  const welcomeMessage = repairText(
    business.welcomeMessage ||
      "Veja serviços, promoções, profissionais e horários disponíveis em uma experiência feita para celular."
  );
  const professionalInitials = (name: string) =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();

  if (screen === "manage") {
    return withNotice(
      <main className={`app${clientThemeClass}`}>
        <section className="card success successPremium">
          <div className="badge">Agendamento</div>
          <h1>Gerenciar horário</h1>
          {publicActionSaving === "load" && <p>Carregando dados do agendamento...</p>}

          {!publicActionSaving && !publicAppointment && (
            <>
              <p>Não encontramos um agendamento ativo para este link.</p>
              <a
                className="black linkButton"
                href={whatsappUrl(business.whatsapp)}
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
                href={whatsappUrl(
                  business.whatsapp,
                  `Olá! Preciso falar sobre meu agendamento de ${formatDateForMessage(
                    publicAppointment.date
                  )} às ${publicAppointment.time}.`
                )}
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
      <main className={`app${clientThemeClass}`}>
        <section className="card success">
          <div className="badge">Agendado</div>
          <h1>{repairText(business.successTitle)}</h1>
          <p>{repairText(business.successMessage)}</p>
          <p>Te esperamos na {repairText(business.name)}.</p>
          {business.address && <p>{repairText(business.address)}</p>}
          {confirmationSent ? (
            <p>{repairText(business.successFooter)}</p>
          ) : (
            <p>
              Seu horário já está reservado. A confirmação automática está em preparação;
              envie os dados pelo WhatsApp para avisar a barbearia agora.
            </p>
          )}
          <p>
            <strong>
              {formatDate(selectedDate)} às {selectedTime}
            </strong>{" "}
            - {servicesText}
          </p>
          <p>Profissional: {professional}</p>
          <div className="successDetailsCard">
            <div className="successDetailsMain">
              <span>Resumo do horário</span>
              <strong>
                {formatDate(selectedDate)} às {selectedTime}
              </strong>
              <small>{servicesText}</small>
            </div>
            <div className="successDetailGrid">
              <div>
                <span>Profissional</span>
                <strong>{professional}</strong>
              </div>
              <div>
                <span>Pagamento</span>
                <strong>{successPaymentLabel}</strong>
              </div>
              <div>
                <span>Local</span>
                <strong>{cleanAddress || repairText(business.name)}</strong>
              </div>
            </div>
          </div>
          <div className="successTimeline">
            <div>
              <span />
              <p>Seu horário já está reservado na agenda.</p>
            </div>
            <div>
              <span />
              <p>
                {confirmationSent
                  ? repairText(business.successFooter)
                  : "A confirmação automática está em preparação. Você pode avisar a barbearia pelo WhatsApp agora."}
              </p>
            </div>
            <div>
              <span />
              <p>Te esperamos no atendimento.</p>
            </div>
          </div>
          {(addToCalendarHref || mapsHref) && (
            <div className="successActionGrid">
              {addToCalendarHref && (
                <a className="black linkButton" href={addToCalendarHref} target="_blank" rel="noreferrer">
                  Adicionar ao calendário
                </a>
              )}
              {mapsHref && (
                <a className="outline linkButton" href={mapsHref} target="_blank" rel="noreferrer">
                  Ver rota
                </a>
              )}
            </div>
          )}
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
            <div className="manualConfirmationBox">
              <strong>Confirmação pronta para WhatsApp</strong>
              <p>
                A barbearia já recebeu o agendamento no painel. Use este botão se quiser
                enviar o resumo completo também pelo WhatsApp.
              </p>
              <a
                className="black linkButton"
                href={whatsappUrl(business.whatsapp, barberConfirmationMessage)}
                target="_blank"
                rel="noreferrer"
              >
                Enviar confirmação para a barbearia
              </a>
              <button
                type="button"
                className="outline"
                onClick={() => copyText(barberConfirmationMessage)}
              >
                Copiar dados do agendamento
              </button>
            </div>
          )}
          <a
            className={confirmationSent ? "black linkButton" : "outline linkButton"}
            href={whatsappUrl(
              business.whatsapp,
              `Olá! Preciso falar sobre meu agendamento para ${formatDateForMessage(selectedDate)} às ${selectedTime}`
            )}
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
      <main className={`app checkoutApp${clientThemeClass}`}>
        <section className="checkoutHeader">
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
              <p className="pixManualNotice">
                Seu horário já fica reservado. Depois de pagar, envie o comprovante pelo
                WhatsApp da barbearia.
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
            <a href={whatsappUrl(business.whatsapp)} target="_blank" rel="noreferrer">
              Falar com a barbearia
            </a>
          </p>
        </section>
      </main>
    );
  }

  if (scheduleBlocked) {
    return withNotice(
      <main className={`app${clientThemeClass}`}>
        <section className="appHeader">
          <div className="brand">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
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
            href={whatsappUrl(business.whatsapp)}
            target="_blank"
            rel="noreferrer"
          >
            Falar com a barbearia
          </a>

        </section>

        <footer className="clientDeveloperFooter">
          <span>Desenvolvido por</span>
          <strong>
            <img src={agendaProLogoUrl} alt="AgendaPro" />
            AgendaPro
          </strong>
          <a href="mailto:appagenda.pro@gmail.com">Entre em contato com o desenvolvedor</a>
        </footer>
      </main>
    );
  }

  return withNotice(
    <main
      className={`app clientBookingApp${clientThemeClass}`}
    >
      <section className="clientMiniSiteHero" style={coverStyle}>
        <div className="clientMiniSiteTop">
          <div className={business.logoImage ? "logo logoWithImage clientHeroLogo" : "logo clientHeroLogo"}>
            {business.logoImage ? (
              <img src={business.logoImage} alt={`Logo da ${repairText(business.name)}`} />
            ) : (
              business.logo
            )}
          </div>
          <button type="button" className="ownerLoginButton" onClick={openAdminArea}>
            Entrar
          </button>
        </div>

        <div className="clientMiniSiteContent">
          <h1>{repairText(business.name)}</h1>
          <div className="clientRating" aria-label="Avaliação da barbearia">
            <span>★★★★★</span>
            <strong>{ratingValue}</strong>
            <small>{ratingText}</small>
          </div>

          {instagramAvailable && (
            <div className="clientMiniSiteActions">
              <a className="instagramAction" href={instagramHref} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </div>
          )}
        </div>
      </section>

      {statusNotice && (
        <section className="clientStatusNotice">
          <strong>Aviso da agenda</strong>
          <p>{statusNotice}</p>
        </section>
      )}

      <section className="heroPanel clientHeroPanel">
        <div>
          <span>Vitrine da barbearia</span>
          <strong>Escolha seu atendimento</strong>
        </div>
        <p>{welcomeMessage}</p>
        <div className="clientHeroMetrics">
          <span>{activeServices.length} serviços</span>
          <span>{clientProfessionals.length} profissionais</span>
          <span>{recommendedTime || "Agenda aberta"}</span>
        </div>
      </section>

      {cleanAddress && (
        <section className="addressCard premiumAddressCard">
          <div>
            <span>Endereço</span>
            <strong>{cleanAddress}</strong>
          </div>
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noreferrer">
              Abrir rota
            </a>
          )}
        </section>
      )}

      {portfolioImages.length > 0 && (
        <section className="portfolioCarousel" aria-label="Fotos da barbearia">
          {portfolioImages.map((image, index) => (
            <div
              key={`${image.label}-${index}`}
              className="portfolioSlide"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.62)), url(${image.url})`,
              }}
            >
              <span>{image.label}</span>
            </div>
          ))}
        </section>
      )}

      {promotionAvailable && activePromotions.length > 0 && (
        <section className="promoBanner promoListBanner clientPromoShowcase">
          <div>
            <span>Promoções disponíveis</span>
            <strong>
              {promotionValue > 0
                ? `Você economiza ${money(promotionValue)}`
                : `${activePromotions.length} promoção disponível`}
            </strong>
            <small>Abra, escolha uma promoção e adicione ao seu agendamento.</small>
          </div>
          <button
            type="button"
            className="promoToggle"
            onClick={() => setPromotionsOpen(!promotionsOpen)}
          >
            {promotionsOpen ? "Ocultar" : "Ver promoções"}
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

      <section className="card">
        <h2>Seus dados</h2>

        {clientGoogleAvailable && (
          <div className={clientGoogleLoggedIn ? "clientGoogleBox connected" : "clientGoogleBox"}>
            {clientGoogleLoggedIn ? (
              <>
                <div className="clientGoogleProfile">
                  {clientGoogleAvatarUrl ? (
                    <img src={clientGoogleAvatarUrl} alt="" />
                  ) : (
                    <span className="clientGoogleAvatar" aria-hidden="true">
                      {(clientGoogleName || clientGoogleEmail || "G").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div>
                    <strong>{clientGoogleName || "Conta Google conectada"}</strong>
                    <small>{clientGoogleEmail}</small>
                  </div>
                </div>
                <button type="button" className="clientGoogleSecondary" onClick={logoutClientGoogle}>
                  Sair da conta Google
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="clientGoogleButton"
                  disabled={clientGoogleLoading}
                  onClick={loginClientWithGoogle}
                >
                  <span className="googleMark" aria-hidden="true">
                    G
                  </span>
                  <span>{clientGoogleLoading ? "Abrindo Google..." : "Entrar com Google"}</span>
                </button>
                <small>Use para preencher seus dados nas próximas visitas.</small>
              </>
            )}

            {clientGoogleMessage && <p>{clientGoogleMessage}</p>}
          </div>
        )}

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
            aria-pressed={selectedServices.includes(service.originalIndex)}
            className={
              selectedServices.includes(service.originalIndex)
                ? "service premiumService selected"
                : "service premiumService"
            }
            onClick={() => toggleService(service.originalIndex)}
          >
            <span className="serviceInfo">
              <strong>{service.name}</strong>
              <small>
                <span>{service.duration} min</span>
                <span>{money(service.price)}</span>
              </small>
            </span>
            <span className="serviceCheck">
              {selectedServices.includes(service.originalIndex) ? "✓" : "+"}
            </span>
          </button>
        ))}
      </section>

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
          </div>

          <div className="professionalGrid">
            {clientProfessionals.map((item) => (
              <button type="button"
                key={item.name}
                className={professional === item.name ? "professionalCard activeProfessional" : "professionalCard"}
                onClick={() => {
                  setProfessional(item.name);
                  setSelectedTime("");
                }}
              >
                <span className={item.photoUrl ? "professionalAvatar professionalAvatarPhoto" : "professionalAvatar"}>
                  {item.photoUrl ? <img src={item.photoUrl} alt={item.name} /> : professionalInitials(item.name)}
                </span>
                <span>
                  <strong>{item.name}</strong>
                  <small>{professional === item.name ? "Selecionado" : "Disponível"}</small>
                </span>
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

        {hasChosenService && slots.some((slot) => slot.available) && (
          <div className="scheduleProfessionalHint">
            <span>Horários por profissional</span>
            <strong>
              {professional === "Primeiro disponível"
                ? "Cada horário mostra quem pode atender"
                : `Filtrando por ${professional}`}
            </strong>
          </div>
        )}

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
                <small>
                  {slot.status === "recommended" && slot.professional
                    ? `${slot.professional} · Recomendado`
                    : slot.label}
                </small>
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

      <footer className="clientDeveloperFooter">
        <span>Desenvolvido por</span>
        <strong>
          <img src={agendaProLogoUrl} alt="AgendaPro" />
          AgendaPro
        </strong>
        <a href="mailto:appagenda.pro@gmail.com">Entre em contato com o desenvolvedor</a>
      </footer>

      <a
        className="clientFloatingWhatsapp"
        href={whatsappUrl(business.whatsapp)}
        target="_blank"
        rel="noreferrer"
        aria-label="Falar no WhatsApp"
        title="Falar no WhatsApp"
      >
        <svg aria-hidden="true" viewBox="0 0 32 32" focusable="false">
          <path d="M16.01 3.2c-7.04 0-12.76 5.62-12.76 12.55 0 2.27.62 4.48 1.8 6.42L3.2 28.8l6.87-1.76a12.9 12.9 0 0 0 5.94 1.45c7.04 0 12.76-5.62 12.76-12.55S23.05 3.2 16.01 3.2Zm0 22.95c-1.88 0-3.72-.5-5.32-1.45l-.38-.23-4.08 1.04 1.1-3.9-.26-.4a10.1 10.1 0 0 1-1.55-5.46c0-5.64 4.7-10.22 10.49-10.22S26.5 10.1 26.5 15.74 21.8 26.15 16 26.15Zm5.74-7.67c-.31-.15-1.84-.9-2.12-1-.29-.1-.5-.15-.71.15-.2.3-.82 1-.99 1.2-.18.2-.37.23-.68.08-.31-.15-1.31-.47-2.5-1.51-.93-.8-1.55-1.8-1.73-2.1-.18-.3-.02-.46.13-.61.14-.13.31-.35.47-.52.16-.18.21-.3.31-.5.1-.2.05-.38-.03-.53-.08-.15-.7-1.67-.96-2.29-.25-.6-.51-.52-.7-.53h-.6c-.2 0-.53.08-.81.38-.28.3-1.06 1.02-1.06 2.49s1.1 2.9 1.25 3.1c.15.2 2.16 3.25 5.23 4.55.73.31 1.3.5 1.75.64.74.23 1.41.2 1.94.12.59-.09 1.84-.74 2.1-1.45.26-.71.26-1.32.18-1.45-.08-.13-.28-.2-.6-.35Z" />
        </svg>
        <span>Falar no WhatsApp</span>
      </a>
    </main>
  );
}
