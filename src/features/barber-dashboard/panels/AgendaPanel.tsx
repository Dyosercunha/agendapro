import React from "react";
import type { Appointment, Barbershop } from "../../../types/app";

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
  confirmAppointmentPayment: (id: string) => void;
  formatDate: (date?: string) => string;
  money: (value?: number) => string;
  realProfessionals: () => string[];
  removeBlock: (index: number) => void;
  removeBreak: (index: number) => void;
  removeDayOff: (index: number) => void;
  rescheduleAppointment: (id: string) => void;
  saveScheduleToCloud: () => void;
  schedule: RealSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<RealSchedule>>;
  updateBlock: (index: number, field: keyof ScheduleBlock, value: string) => void;
  updateBreak: (index: number, field: keyof ScheduleBreak, value: string) => void;
  updateDayOff: (index: number, field: keyof ScheduleDayOff, value: string) => void;
  updateWaitlistStatus: (id: string, status: "waiting" | "contacted" | "removed") => void;
  updateWorkingDay: (
    dayKey: WeekDayKey,
    field: keyof WorkingDayConfig,
    value: string | boolean
  ) => void;
  waitlist: AgendaWaitlistEntry[];
  waitlistAvailable: boolean;
  weekDays: WeekDay[];
};

type AgendaPanelProps = {
  model: AgendaPanelModel;
};

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
    saveScheduleToCloud,
    schedule,
    setSchedule,
    updateBlock,
    updateBreak,
    updateDayOff,
    updateWaitlistStatus,
    updateWorkingDay,
    waitlist,
    waitlistAvailable,
    weekDays,
  } = model;

  return (
    <>
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

    </>
  );
}
