import React from "react";
import type { Appointment, Barbershop, Client } from "../../../types/app";

export type CustomersPanelModel = {
  activeAdminTab: string;
  appointments: Appointment[];
  business: Barbershop;
  canUseAdminTab: (tabId: string) => boolean;
  customerProfiles: Client[];
  formatDate: (date?: string) => string;
  loyaltyFeatureEnabled: boolean;
  money: (value?: number) => string;
  returningCustomers: Client[];
  setAdminTab: (tabId: string) => void;
  topCustomer?: Client | null;
};

type CustomersPanelProps = {
  model: CustomersPanelModel;
};

function cleanPhone(value?: string) {
  return String(value || "").replace(/\D/g, "");
}

function sortHistory(appointments: Appointment[]) {
  return [...appointments].sort((first, second) =>
    `${second.date || ""} ${second.time || ""}`.localeCompare(
      `${first.date || ""} ${first.time || ""}`
    )
  );
}

function mostFrequentProfessional(appointments: Appointment[]) {
  const ranking = appointments.reduce<Record<string, number>>((acc, appointment) => {
    const professional = String(appointment.professional || "").trim();
    if (!professional) return acc;
    acc[professional] = (acc[professional] || 0) + 1;
    return acc;
  }, {});

  return (
    Object.entries(ranking).sort((first, second) => second[1] - first[1])[0]?.[0] ||
    "Sem preferência"
  );
}

function getUniqueNotes(appointments: Appointment[]) {
  return Array.from(
    new Set(
      appointments
        .map((appointment) => String(appointment.note || "").trim())
        .filter(Boolean)
    )
  );
}

function statusLabel(appointment: Appointment) {
  const status = String(appointment.status || "").toLowerCase();

  if (status === "cancelled" || status === "cancelado") return "Cancelado";
  if (status === "completed" || status === "finalizado") return "Finalizado";
  if (status === "missed" || status === "faltou" || status === "no_show") return "Faltou";
  if (appointment.paid) return "Pago";
  if (status === "confirmed" || status === "confirmado") return "Confirmado";
  return "Pendente";
}

export default function CustomersPanel({ model }: CustomersPanelProps) {
  const {
    activeAdminTab,
    appointments,
    business,
    canUseAdminTab,
    customerProfiles,
    formatDate,
    loyaltyFeatureEnabled,
    money,
    returningCustomers,
    setAdminTab,
    topCustomer,
  } = model;

  const totalRevenue = customerProfiles.reduce(
    (sum, customer) => sum + Number(customer.revenue || 0),
    0
  );
  const totalVisits = customerProfiles.reduce(
    (sum, customer) => sum + Number(customer.visits || 0),
    0
  );
  const averageTicket = totalVisits > 0 ? totalRevenue / totalVisits : 0;
  const customersWithPendingPayment = customerProfiles.filter(
    (customer) => Number(customer.pendingPayment || 0) > 0
  );

  function getCustomerHistory(customer: Client) {
    const phone = cleanPhone(customer.whatsapp);
    const customerName = String(customer.name || "").trim().toLowerCase();

    return sortHistory(
      appointments.filter((appointment) => {
        const appointmentPhone = cleanPhone(appointment.whatsapp);
        const appointmentName = String(appointment.clientName || "").trim().toLowerCase();

        return (
          (phone && appointmentPhone === phone) ||
          (!phone && customerName && appointmentName === customerName)
        );
      })
    );
  }

  return (
    <>
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

        <div className="customerInsightPanel">
          <div>
            <span>Receita registrada</span>
            <strong>{money(totalRevenue)}</strong>
            <small>{totalVisits} atendimentos no histórico</small>
          </div>
          <div>
            <span>Ticket médio</span>
            <strong>{money(averageTicket)}</strong>
            <small>média por visita registrada</small>
          </div>
          <div>
            <span>Pendências</span>
            <strong>{customersWithPendingPayment.length}</strong>
            <small>clientes com pagamento pendente</small>
          </div>
        </div>

        {topCustomer && (
          <div className="topCustomerCard">
            <div>
              <span>Cliente em destaque</span>
              <strong>{topCustomer.name}</strong>
              <p>
                {topCustomer.visits} visitas, {money(topCustomer.revenue)} em histórico e último
                atendimento em {formatDate(topCustomer.lastDate)}.
              </p>
            </div>
            <a
              className="whatsappAction"
              href={`https://wa.me/${topCustomer.whatsappLink}?text=${encodeURIComponent(
                `Olá, ${topCustomer.name}! Aqui é da ${business.name}.`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Chamar no WhatsApp
            </a>
          </div>
        )}

        {customerProfiles.length === 0 && (
          <p className="hint">Os clientes aparecem aqui depois dos primeiros agendamentos.</p>
        )}

        <div className="customerList">
          {customerProfiles.map((customer) => {
            const history = getCustomerHistory(customer);
            const notes = getUniqueNotes(history);
            const preferredProfessional =
              customer.preferredProfessional || mostFrequentProfessional(history);
            const loyaltyPoints =
              Number(customer.loyaltyPoints || 0) ||
              (loyaltyFeatureEnabled ? Number(customer.visits || 0) * 10 : 0);
            const email =
              customer.email ||
              history.find((appointment) => appointment.email)?.email ||
              "Não informado";

            return (
              <article className="customerProfileCard" key={customer.whatsapp}>
                <div className="customerProfileHeader">
                  <div className="customerAvatar">{customer.name.slice(0, 1).toUpperCase()}</div>
                  <div>
                    <span>Ficha do cliente</span>
                    <strong>{customer.name}</strong>
                    <p>Último atendimento: {formatDate(customer.lastDate)} às {customer.lastTime}</p>
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

                <div className="customerProfileGrid">
                  <div>
                    <span>WhatsApp</span>
                    <strong>{customer.whatsapp}</strong>
                  </div>
                  <div>
                    <span>E-mail</span>
                    <strong>{email}</strong>
                  </div>
                  <div>
                    <span>Último serviço</span>
                    <strong>{customer.lastServices || "Sem histórico"}</strong>
                  </div>
                  <div>
                    <span>Total gasto</span>
                    <strong>{money(customer.revenue)}</strong>
                  </div>
                  <div>
                    <span>Quantidade de visitas</span>
                    <strong>{customer.visits || 0}</strong>
                  </div>
                  <div>
                    <span>Pontos de fidelidade</span>
                    <strong>{loyaltyFeatureEnabled ? loyaltyPoints : "Bloqueado"}</strong>
                  </div>
                  <div>
                    <span>Preferência</span>
                    <strong>{preferredProfessional}</strong>
                  </div>
                  <div>
                    <span>Ticket médio</span>
                    <strong>{money(Number(customer.revenue || 0) / Math.max(1, Number(customer.visits || 0)))}</strong>
                  </div>
                  <div>
                    <span>Pendências</span>
                    <strong>{Number(customer.pendingPayment || 0) > 0 ? "Pagamento pendente" : "Em dia"}</strong>
                  </div>
                </div>

                <div className="customerNotesBox">
                  <span>Observações internas</span>
                  {notes.length > 0 ? (
                    notes.map((note) => <p key={note}>{note}</p>)
                  ) : (
                    <p>Sem observações internas registradas.</p>
                  )}
                </div>

                <details className="customerHistoryBox">
                  <summary>Histórico de agendamentos ({history.length})</summary>

                  {history.length === 0 && (
                    <p className="hint">Nenhum agendamento encontrado para este cliente.</p>
                  )}

                  {history.map((appointment) => (
                    <div className="customerHistoryItem" key={appointment.id || `${appointment.date}-${appointment.time}`}>
                      <div>
                        <strong>
                          {formatDate(appointment.date)} às {appointment.time}
                        </strong>
                        <p>{appointment.services || "Serviço não informado"}</p>
                        <small>{appointment.professional || "Profissional não informado"}</small>
                      </div>
                      <div>
                        <span>{statusLabel(appointment)}</span>
                        <strong>{money(appointment.total)}</strong>
                      </div>
                    </div>
                  ))}
                </details>

                <div className="customerBadges">
                  <span>{customer.visits} visitas</span>
                  <span>{money(customer.revenue)}</span>
                  <span>{preferredProfessional}</span>
                  {customer.pendingPayment > 0 && <span>Pagamento pendente</span>}
                  {loyaltyFeatureEnabled && customer.visits >= 5 && <span>Prêmio sugerido</span>}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
