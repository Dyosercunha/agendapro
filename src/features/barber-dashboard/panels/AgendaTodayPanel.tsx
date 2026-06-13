import React, { useMemo, useState } from "react";
import type { Appointment, Barbershop } from "../../../types/app";
import { whatsappUrl } from "../../../lib/phone";

type AgendaTodayAppointment = Appointment & {
  clientName?: string;
  date?: string;
  duration?: number;
  id?: string;
  paid?: boolean;
  professional?: string;
  rescheduleRequested?: boolean;
  services?: string;
  time?: string;
  total?: number;
  whatsapp?: string;
};

export type AgendaTodayPanelModel = {
  activeAdminTab: string;
  appointments: AgendaTodayAppointment[];
  business: Barbershop;
  cancelAppointment: (id: string) => void;
  completeAppointment: (id: string) => void;
  confirmAppointment: (id: string) => void;
  confirmAppointmentPayment: (id: string, paymentMode?: string) => void;
  formatDate: (date?: string) => string;
  money: (value?: number) => string;
  realProfessionals: () => string[];
  rescheduleAppointment: (id: string) => void;
};

type AgendaTodayPanelProps = {
  model: AgendaTodayPanelModel;
};

type AgendaTodayStatus =
  | "pending"
  | "confirmed"
  | "paid"
  | "completed"
  | "cancelled"
  | "missed";

const statusLabels: Record<AgendaTodayStatus, string> = {
  cancelled: "Cancelado",
  completed: "Finalizado",
  confirmed: "Confirmado",
  missed: "Faltou",
  paid: "Pago",
  pending: "Pendente",
};

const statusFilterOptions = [
  { label: "Todos", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Confirmados", value: "confirmed" },
  { label: "Pagos", value: "paid" },
  { label: "Finalizados", value: "completed" },
  { label: "Cancelados", value: "cancelled" },
];

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  return new Date(year || 0, (month || 1) - 1, day || 1);
}

function addDays(dateKey: string, amount: number) {
  const date = dateFromKey(dateKey);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

function getStatus(appointment: AgendaTodayAppointment): AgendaTodayStatus {
  const status = String(appointment.status || "scheduled").toLowerCase();

  if (["cancelled", "canceled", "cancelado"].includes(status)) return "cancelled";
  if (["completed", "finalizado"].includes(status)) return "completed";
  if (["missed", "faltou", "no_show"].includes(status)) return "missed";
  if (appointment.paid) return "paid";
  if (["confirmed", "confirmado"].includes(status)) return "confirmed";

  return "pending";
}

function sortAppointments(appointments: AgendaTodayAppointment[]) {
  return [...appointments].sort((first, second) =>
    `${first.date || ""} ${first.time || ""}`.localeCompare(
      `${second.date || ""} ${second.time || ""}`
    )
  );
}

export default function AgendaTodayPanel({ model }: AgendaTodayPanelProps) {
  const {
    activeAdminTab,
    appointments,
    business,
    cancelAppointment,
    completeAppointment,
    confirmAppointment,
    confirmAppointmentPayment,
    formatDate,
    money,
    realProfessionals,
    rescheduleAppointment,
  } = model;

  const todayKey = toDateKey(new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [professionalFilter, setProfessionalFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState("");

  const professionalOptions = useMemo(() => ["Todos", ...realProfessionals()], [realProfessionals]);
  const visibleAppointments = useMemo(
    () =>
      sortAppointments(
        appointments.filter((appointment) => {
          const status = getStatus(appointment);

          return (
            appointment.date === selectedDate &&
            (professionalFilter === "Todos" || appointment.professional === professionalFilter) &&
            (statusFilter === "all" || status === statusFilter)
          );
        })
      ),
    [appointments, professionalFilter, selectedDate, statusFilter]
  );

  const upcomingAppointments = useMemo(
    () =>
      sortAppointments(
        appointments.filter((appointment) => {
          const status = getStatus(appointment);
          return appointment.date && appointment.date >= todayKey && status !== "cancelled";
        })
      ).slice(0, 4),
    [appointments, todayKey]
  );

  const selectedAppointment =
    visibleAppointments.find((appointment) => appointment.id === selectedAppointmentId) ||
    visibleAppointments[0] ||
    null;

  const confirmedCount = visibleAppointments.filter((item) =>
    ["confirmed", "paid", "completed"].includes(getStatus(item))
  ).length;
  const pendingCount = visibleAppointments.filter((item) => getStatus(item) === "pending").length;
  const paidTotal = visibleAppointments
    .filter((item) => item.paid)
    .reduce((sum, item) => sum + Number(item.total || 0), 0);
  const scheduledTotal = visibleAppointments.reduce((sum, item) => sum + Number(item.total || 0), 0);

  function handleCardClick(appointmentId?: string) {
    if (!appointmentId) return;
    setSelectedAppointmentId((current) => (current === appointmentId ? "" : appointmentId));
  }

  function renderActionButtons(appointment: AgendaTodayAppointment, compact = false) {
    const id = appointment.id || "";
    const status = getStatus(appointment);
    const canEdit = Boolean(id) && status !== "cancelled" && status !== "completed";
    const clientWhatsapp = appointment.whatsapp || "";

    return (
      <div className={compact ? "agendaTodayActions compact" : "agendaTodayActions"}>
        {canEdit && status === "pending" && (
          <button type="button" onClick={() => confirmAppointment(id)}>
            Confirmar
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={() => completeAppointment(id)}>
            Finalizar
          </button>
        )}
        {canEdit && !appointment.paid && (
          <button type="button" onClick={() => confirmAppointmentPayment(id, "cash")}>
            Marcar pago
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={() => rescheduleAppointment(id)}>
            Reagendar
          </button>
        )}
        {clientWhatsapp && (
          <a
            className="agendaTodayWhatsapp"
            href={whatsappUrl(
              clientWhatsapp,
              `Olá, ${appointment.clientName || ""}! Aqui é da ${business.name}. Sobre seu horário de ${formatDate(appointment.date)} às ${appointment.time}.`
            )}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        )}
        {canEdit && (
          <button type="button" className="dangerAction" onClick={() => cancelAppointment(id)}>
            Cancelar
          </button>
        )}
      </div>
    );
  }

  return (
    <section
      className={
        activeAdminTab === "agendaToday"
          ? "card agendaTodayPanelCard"
          : "hiddenPanel"
      }
    >
      <div className="panelHero agendaTodayHero">
        <div>
          <span>Prévia operacional</span>
          <h2>Agenda Hoje</h2>
          <p>
            Uma visão simples para o barbeiro trabalhar no dia: cliente, horário, status e ações
            rápidas sem depender do WhatsApp ou do caderno.
          </p>
        </div>

        <div className="panelHeroMetric agendaTodayHeroMetric">
          <span>{formatDate(selectedDate)}</span>
          <strong>{visibleAppointments.length}</strong>
          <small>{visibleAppointments.length === 1 ? "horário no dia" : "horários no dia"}</small>
        </div>
      </div>

      <div className="agendaTodayMetrics">
        <article>
          <span>Confirmados</span>
          <strong>{confirmedCount}</strong>
          <small>{pendingCount} pendente(s)</small>
        </article>
        <article>
          <span>Previsto</span>
          <strong>{money(scheduledTotal)}</strong>
          <small>total do dia</small>
        </article>
        <article>
          <span>Recebido</span>
          <strong>{money(paidTotal)}</strong>
          <small>marcado como pago</small>
        </article>
      </div>

      <div className="agendaTodayToolbar">
        <div className="agendaTodayDateStepper">
          <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -1))}>
            Anterior
          </button>
          <label>
            Dia
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value || todayKey)}
            />
          </label>
          <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            Próximo
          </button>
        </div>

        <div className="agendaTodayFilters">
          <label>
            Profissional
            <select
              value={professionalFilter}
              onChange={(event) => setProfessionalFilter(event.target.value)}
            >
              {professionalOptions.map((professional) => (
                <option value={professional} key={professional}>
                  {professional}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusFilterOptions.map((option) => (
                <option value={option.value} key={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="agendaTodayWorkspace">
        <div className="agendaTodayTimeline">
          {visibleAppointments.length === 0 && (
            <div className="agendaTodayEmpty">
              <strong>Nenhum horário para este filtro</strong>
              <span>Altere o dia, profissional ou status para acompanhar a agenda.</span>
              {upcomingAppointments.length > 0 && (
                <div className="agendaTodayNextList">
                  <small>Próximos horários</small>
                  {upcomingAppointments.map((appointment) => (
                    <button
                      type="button"
                      key={appointment.id || `${appointment.date}-${appointment.time}`}
                      onClick={() => {
                        if (appointment.date) setSelectedDate(appointment.date);
                        if (appointment.professional) setProfessionalFilter(appointment.professional);
                      }}
                    >
                      {formatDate(appointment.date)} às {appointment.time} -{" "}
                      {appointment.clientName || "Cliente"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {visibleAppointments.map((appointment) => {
            const status = getStatus(appointment);
            const selected = selectedAppointment?.id === appointment.id;

            return (
              <article
                className={
                  selected
                    ? `agendaTodayAppointment active status-${status}`
                    : `agendaTodayAppointment status-${status}`
                }
                key={appointment.id || `${appointment.date}-${appointment.time}-${appointment.clientName}`}
                onClick={() => handleCardClick(appointment.id)}
              >
                <div className="agendaTodayTime">
                  <strong>{appointment.time}</strong>
                  <span>{appointment.duration || 0} min</span>
                </div>

                <div className="agendaTodayInfo">
                  <div className="agendaTodayCardHeader">
                    <strong>{appointment.clientName || "Cliente sem nome"}</strong>
                    <span className={`appointmentStatusPill status-${status}`}>
                      {statusLabels[status]}
                    </span>
                  </div>
                  <p>{appointment.services || "Serviço não informado"}</p>
                  <div className="agendaTodayMeta">
                    <span>{appointment.professional || "Profissional"}</span>
                    <span>{money(appointment.total)}</span>
                    <span>{appointment.paid ? "Pago" : "Pagamento pendente"}</span>
                  </div>
                </div>

                {renderActionButtons(appointment, true)}
              </article>
            );
          })}
        </div>

        <aside className="agendaTodayDetails">
          <div className="agendaTodayDetailsHeader">
            <span>Detalhes rápidos</span>
            <strong>{selectedAppointment ? selectedAppointment.time : "--:--"}</strong>
          </div>

          {selectedAppointment ? (
            <>
              <h3>{selectedAppointment.clientName || "Cliente sem nome"}</h3>
              <p>{selectedAppointment.services || "Serviço não informado"}</p>
              <div className="agendaTodayDetailGrid">
                <div>
                  <span>Profissional</span>
                  <strong>{selectedAppointment.professional || "Não informado"}</strong>
                </div>
                <div>
                  <span>Valor</span>
                  <strong>{money(selectedAppointment.total)}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{statusLabels[getStatus(selectedAppointment)]}</strong>
                </div>
                <div>
                  <span>Pagamento</span>
                  <strong>{selectedAppointment.paid ? "Pago" : "Pendente"}</strong>
                </div>
              </div>

              {selectedAppointment.note && (
                <p className="agendaTodayNote">Obs.: {selectedAppointment.note}</p>
              )}

              {selectedAppointment.rescheduleRequested && (
                <p className="agendaTodayReschedule">Cliente solicitou remarcação.</p>
              )}

              {renderActionButtons(selectedAppointment)}
            </>
          ) : (
            <p className="agendaTodayHint">Selecione um card para ver ações e detalhes do cliente.</p>
          )}
        </aside>
      </div>
    </section>
  );
}
