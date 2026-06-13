import React, { useEffect, useState } from "react";
import type { Appointment, Barbershop } from "../../../types/app";
import { whatsappUrl } from "../../../lib/phone";

export type WeekDayKey = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type WeekDay = {
  key: WeekDayKey;
  label: string;
  short: string;
};

export type WorkingDayConfig = {
  enabled: boolean;
  end: string;
  start: string;
};

export type ScheduleBreak = {
  end: string;
  id: string;
  name: string;
  start: string;
};

export type ScheduleDayOff = {
  date: string;
  id: string;
  reason: string;
};

export type ScheduleBlock = {
  date: string;
  end: string;
  id: string;
  professional: string;
  reason: string;
  start: string;
};

export type RealSchedule = {
  blocks: ScheduleBlock[];
  breaks: ScheduleBreak[];
  daysOff: ScheduleDayOff[];
  slotInterval: number;
  workingHours: Record<WeekDayKey, WorkingDayConfig>;
};

export type AgendaAppointment = Appointment & {
  clientName: string;
  date: string;
  duration?: number;
  id: string;
  note?: string;
  paid?: boolean;
  professional: string;
  rescheduleRequested?: boolean;
  services: string;
  time: string;
  total?: number;
};

export type AgendaWaitlistEntry = {
  clientName: string;
  date: string;
  id: string;
  services: string;
  status: "waiting" | "contacted" | string;
  whatsapp: string;
};

export type AgendaPanelModel = {
  activeAdminTab: string;
  addBlock: () => void;
  addBreak: () => void;
  addDayOff: () => void;
  appointments: AgendaAppointment[];
  business: Barbershop;
  cancelAppointment: (id: string) => void;
  canManageBusinessSettings: boolean;
  cloudSaving: string;
  confirmAppointmentPayment: (id: string, paymentMode?: string) => void;
  formatDate: (date?: string) => string;
  money: (value?: number) => string;
  realProfessionals: () => string[];
  removeBlock: (index: number) => void;
  removeBreak: (index: number) => void;
  removeDayOff: (index: number) => void;
  rescheduleAppointment: (id: string) => void;
  saveAppointmentNote: (id: string) => void;
  saveScheduleToCloud: () => void;
  schedule: RealSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<RealSchedule>>;
  updateBlock: (index: number, field: keyof ScheduleBlock, value: string) => void;
  updateBreak: (index: number, field: keyof ScheduleBreak, value: string) => void;
  updateDayOff: (index: number, field: keyof ScheduleDayOff, value: string) => void;
  updateAppointmentNote: (id: string, note: string) => void;
  updateWaitlistStatus: (id: string, status: "waiting" | "contacted" | "removed") => void;
  updateWorkingDay: (
    dayKey: WeekDayKey,
    field: keyof WorkingDayConfig,
    value: string | boolean
  ) => void;
  visualAgendaAvailable: boolean;
  waitlist: AgendaWaitlistEntry[];
  waitlistAvailable: boolean;
  weekDays: WeekDay[];
};

type AgendaPanelProps = {
  model: AgendaPanelModel;
};

type AgendaViewMode = "day" | "week";

type AgendaPanelState = {
  date?: string;
  professional?: string;
  view?: AgendaViewMode;
};

type VisualAppointmentStatus =
  | "confirmed"
  | "pending"
  | "cancelled"
  | "completed"
  | "missed"
  | "paid";

const appointmentStatusLabels: Record<VisualAppointmentStatus, string> = {
  cancelled: "Cancelado",
  completed: "Finalizado",
  confirmed: "Confirmado",
  missed: "Faltou",
  paid: "Pago",
  pending: "Pendente",
};

const internalNoteSuggestions = [
  "Gosta de degradê baixo",
  "Prefere horário pela manhã",
  "Cliente sempre atrasa",
  "Tem alergia a produto X",
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, amount: number) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

const agendaPanelStatePrefix = "agendapro:agenda-panel:";

function agendaPanelStateKey(slug = "default") {
  return `${agendaPanelStatePrefix}${slug || "default"}`;
}

function readAgendaPanelState(slug?: string): AgendaPanelState {
  if (typeof window === "undefined") return {};

  try {
    const data = window.localStorage.getItem(agendaPanelStateKey(slug));
    if (!data) return {};
    return JSON.parse(data) || {};
  } catch {
    return {};
  }
}

function saveAgendaPanelState(slug: string | undefined, state: AgendaPanelState) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(agendaPanelStateKey(slug), JSON.stringify(state));
  } catch {
    // O painel continua funcionando mesmo se o navegador bloquear o cache local.
  }
}

function currentPanelSlugFromPath() {
  if (typeof window === "undefined") return "";

  const parts = window.location.pathname.split("/").filter(Boolean);
  const panelIndex = parts.findIndex((part) => part.toLowerCase() === "painel");
  return panelIndex >= 0 ? String(parts[panelIndex + 1] || "").trim().toLowerCase() : "";
}

function getVisualStatus(appointment: AgendaAppointment): VisualAppointmentStatus {
  const status = String(appointment.status || "scheduled").toLowerCase();

  if (status === "cancelled" || status === "canceled" || status === "cancelado") {
    return "cancelled";
  }

  if (status === "completed" || status === "finalizado") {
    return "completed";
  }

  if (status === "missed" || status === "faltou" || status === "no_show") {
    return "missed";
  }

  if (appointment.paid) {
    return "paid";
  }

  if (status === "confirmed" || status === "confirmado") {
    return "confirmed";
  }

  return "pending";
}

function sortAppointments(appointments: AgendaAppointment[]) {
  return [...appointments].sort((first, second) =>
    `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`)
  );
}

export default function AgendaPanel({ model }: AgendaPanelProps) {
  const {
    activeAdminTab,
    addBlock,
    addBreak,
    addDayOff,
    appointments,
    business,
    cancelAppointment,
    canManageBusinessSettings,
    cloudSaving,
    confirmAppointmentPayment,
    formatDate,
    money,
    realProfessionals,
    removeBlock,
    removeBreak,
    removeDayOff,
    rescheduleAppointment,
    saveAppointmentNote,
    saveScheduleToCloud,
    schedule,
    setSchedule,
    updateBlock,
    updateBreak,
    updateDayOff,
    updateAppointmentNote,
    updateWaitlistStatus,
    updateWorkingDay,
    visualAgendaAvailable,
    waitlist,
    waitlistAvailable,
    weekDays,
  } = model;

  const todayDateKey = toDateKey(new Date());
  const agendaStateSlug = currentPanelSlugFromPath() || business.slug;
  const savedAgendaPanelState = readAgendaPanelState(agendaStateSlug);
  const savedAgendaDate =
    savedAgendaPanelState.date && savedAgendaPanelState.date >= todayDateKey
      ? savedAgendaPanelState.date
      : "";
  const [agendaView, setAgendaView] = useState<AgendaViewMode>(
    savedAgendaPanelState.view === "week" ? "week" : "day"
  );
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(
    () => savedAgendaDate || todayDateKey
  );
  const [agendaDateTouched, setAgendaDateTouched] = useState(Boolean(savedAgendaDate));
  const [professionalFilter, setProfessionalFilter] = useState(
    savedAgendaPanelState.professional || "Todos"
  );
  const premiumAgendaPlanEnabled = String(business.plan || "").toLowerCase() === "premium";
  const premiumAgendaTabActive = activeAdminTab === "agendaPremium";

  const professionalOptions = ["Todos", ...realProfessionals()];
  const filteredAppointments = sortAppointments(
    appointments.filter(
      (appointment) =>
        professionalFilter === "Todos" || appointment.professional === professionalFilter
    )
  );
  const firstUpcomingAppointmentDate = filteredAppointments.find((appointment) => {
    const status = getVisualStatus(appointment);
    return status !== "cancelled" && appointment.date >= todayDateKey;
  })?.date;
  const dayAppointments = filteredAppointments.filter(
    (appointment) => appointment.date === selectedAgendaDate
  );
  const weekDateKeys = Array.from({ length: 7 }, (_, index) => addDays(selectedAgendaDate, index));
  const weekAppointments = weekDateKeys.map((dateKey) => ({
    appointments: filteredAppointments.filter((appointment) => appointment.date === dateKey),
    dateKey,
  }));
  const visualAppointments =
    agendaView === "day"
      ? dayAppointments
      : filteredAppointments.filter((appointment) => weekDateKeys.includes(appointment.date));

  useEffect(() => {
    if (!premiumAgendaTabActive || agendaDateTouched || !firstUpcomingAppointmentDate) return;
    if (selectedAgendaDate === firstUpcomingAppointmentDate) return;

    setSelectedAgendaDate(firstUpcomingAppointmentDate);
  }, [
    agendaDateTouched,
    firstUpcomingAppointmentDate,
    premiumAgendaTabActive,
    selectedAgendaDate,
  ]);

  useEffect(() => {
    saveAgendaPanelState(agendaStateSlug, {
      date: selectedAgendaDate,
      professional: professionalFilter,
      view: agendaView,
    });
  }, [agendaStateSlug, agendaView, professionalFilter, selectedAgendaDate]);

  function chooseAgendaDate(dateKey: string) {
    if (!dateKey) return;

    setAgendaDateTouched(true);
    setSelectedAgendaDate(dateKey);
  }

  function renderAppointmentCard(appointment: AgendaAppointment) {
    const status = getVisualStatus(appointment);
    const canEditAppointment = status !== "cancelled" && status !== "completed";

    return (
      <article className={`visualAppointmentCard status-${status}`} key={appointment.id}>
        <div className="visualAppointmentTop">
          <div>
            <strong>{appointment.time}</strong>
            <span>{formatDate(appointment.date)}</span>
          </div>
          <span className={`appointmentStatusPill status-${status}`}>
            {appointmentStatusLabels[status]}
          </span>
        </div>

        <div className="visualAppointmentBody">
          <strong>{appointment.clientName}</strong>
          <p>{appointment.services}</p>
          <div className="visualAppointmentMeta">
            <span>{appointment.professional}</span>
            <span>{appointment.duration || 0} min</span>
            <span>{money(appointment.total)}</span>
          </div>
        </div>

        {appointment.note && <p className="visualAppointmentNote">Obs.: {appointment.note}</p>}
        {appointment.rescheduleRequested && (
          <p className="rescheduleNotice">Remarcação solicitada</p>
        )}

        <div className="appointmentNoteEditor">
          <label>Observação interna</label>
          <textarea
            value={appointment.note || ""}
            placeholder="Ex.: gosta de degradê baixo, prefere horário pela manhã..."
            disabled={!canEditAppointment}
            onChange={(event) => updateAppointmentNote(appointment.id, event.target.value)}
          />
          <div className="noteSuggestionChips">
            {internalNoteSuggestions.map((suggestion) => (
              <button
                type="button"
                key={suggestion}
                disabled={!canEditAppointment}
                onClick={() => {
                  const currentNote = String(appointment.note || "").trim();
                  const nextNote = currentNote ? `${currentNote}; ${suggestion}` : suggestion;
                  updateAppointmentNote(appointment.id, nextNote);
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="saveNoteButton"
            disabled={!canEditAppointment}
            onClick={() => saveAppointmentNote(appointment.id)}
          >
            Salvar observação
          </button>
        </div>

        <div className="dragFuture">Arrastar para reagendar em breve</div>

        <div className="appointmentActions">
          {!appointment.paid && canEditAppointment && (
            <div className="paymentQuickActions">
              <span>Marcar como pago</span>
              <button type="button" onClick={() => confirmAppointmentPayment(appointment.id, "cash")}>
                Dinheiro
              </button>
              <button type="button" onClick={() => confirmAppointmentPayment(appointment.id, "pix")}>
                PIX
              </button>
              <button type="button" onClick={() => confirmAppointmentPayment(appointment.id, "card")}>
                Cartão
              </button>
            </div>
          )}
          {canEditAppointment && (
            <button type="button" onClick={() => rescheduleAppointment(appointment.id)}>
              {appointment.rescheduleRequested ? "Remarcação marcada" : "Remarcar"}
            </button>
          )}
          {status !== "cancelled" && (
            <button type="button" className="dangerAction" onClick={() => cancelAppointment(appointment.id)}>
              Cancelar
            </button>
          )}
        </div>
      </article>
    );
  }

  function renderPremiumLockedCard(title: string, description: string) {
    return (
      <article className="premiumAgendaLockedCard">
        <span>Plano Premium</span>
        <strong>{title}</strong>
        <p>{description}</p>
        <small>
          {premiumAgendaPlanEnabled
            ? "Libere e ative este recurso na aba Melhorias."
            : "Altere para o plano Premium para liberar este recurso nesta barbearia."}
        </small>
      </article>
    );
  }

  return (
    <>
        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card agendaPanelCard" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Agenda real</h2>
            <span>Funcionamento</span>
          </div>
          <p className="hint panelLead">
            Configure horários, pausas e bloqueios para manter a disponibilidade real no cliente.
          </p>

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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card agendaPanelCard" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card agendaPanelCard" : "hiddenPanel"}>
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

        <section className={activeAdminTab === "agenda" && canManageBusinessSettings ? "card agendaPanelCard" : "hiddenPanel"}>
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


        {premiumAgendaTabActive && (!visualAgendaAvailable || !waitlistAvailable) && (
          <section className="card agendaPanelCard premiumAgendaGate">
            <div className="sectionTitle">
              <h2>Agenda Premium</h2>
              <span>{premiumAgendaPlanEnabled ? "Ative em Melhorias" : "Bloqueado no plano atual"}</span>
            </div>
            <p className="hint panelLead">
              Agenda visual e lista de espera são recursos do plano Premium.
            </p>
            <div className="premiumAgendaLockGrid">
              {!visualAgendaAvailable && renderPremiumLockedCard(
                "Agenda visual",
                "Visão por dia e semana, status dos atendimentos, filtros por profissional e ações rápidas."
              )}
              {!waitlistAvailable && renderPremiumLockedCard(
                "Lista de espera",
                "Fila de clientes aguardando encaixe com contato rápido pelo WhatsApp."
              )}
            </div>
          </section>
        )}

        <section className={premiumAgendaTabActive && visualAgendaAvailable ? "card agendaPanelCard visualAgendaPanel" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Agenda visual</h2>
            <span>{visualAppointments.length} agendamentos</span>
          </div>

          <div className="agendaControlBar">
            <div className="agendaViewToggle" aria-label="Visualização da agenda">
              <button
                type="button"
                className={agendaView === "day" ? "activeView" : ""}
                onClick={() => setAgendaView("day")}
              >
                Dia
              </button>
              <button
                type="button"
                className={agendaView === "week" ? "activeView" : ""}
                onClick={() => setAgendaView("week")}
              >
                Semana
              </button>
            </div>

            <div className="agendaFilters">
              <label>
                Data
                <input
                  type="date"
                  value={selectedAgendaDate}
                  onChange={(event) => {
                    if (event.target.value) {
                      chooseAgendaDate(event.target.value);
                    }
                  }}
                />
              </label>

              <label>
                Profissional
                <select
                  value={professionalFilter}
                  onChange={(event) => setProfessionalFilter(event.target.value)}
                >
                  {professionalOptions.map((professional) => (
                    <option key={professional} value={professional}>
                      {professional}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="agendaStatusLegend" aria-label="Legenda de status">
            {(Object.keys(appointmentStatusLabels) as VisualAppointmentStatus[]).map((status) => (
              <span key={status}>
                <i className={`statusDot status-${status}`} />
                {appointmentStatusLabels[status]}
              </span>
            ))}
          </div>
          {agendaView === "day" && (
            <div className="visualAgendaBoard">
              {dayAppointments.length === 0 && (
                <div className="emptyVisualAgenda">
                  <strong>Nenhum horário para este dia</strong>
                  <p>Use os filtros acima ou acompanhe a visão semanal.</p>
                </div>
              )}

              {dayAppointments.map(renderAppointmentCard)}
            </div>
          )}

          {agendaView === "week" && (
            <div className="visualWeekBoard">
              {weekAppointments.map((group) => (
                <div className="visualWeekDay" key={group.dateKey}>
                  <div className="visualWeekDayHeader">
                    <strong>{formatDate(group.dateKey)}</strong>
                    <span>{group.appointments.length}</span>
                  </div>

                  {group.appointments.length === 0 && <p className="weekEmpty">Sem horários</p>}

                  {group.appointments.map(renderAppointmentCard)}
                </div>
              ))}
            </div>
          )}

        </section>

        <section className={premiumAgendaTabActive && waitlistAvailable ? "card agendaPanelCard waitlistPanel" : "hiddenPanel"}>
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
                  href={whatsappUrl(
                    business.whatsapp,
                    `Cliente na lista de espera: ${item.clientName} | WhatsApp: ${item.whatsapp} | Data: ${formatDate(item.date)} | Serviço: ${item.services}`
                  )}
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

    </>
  );
}
