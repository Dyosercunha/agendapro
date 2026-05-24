import React from "react";
import type { Barbershop, Client } from "../../../types/app";

type CustomersPanelProps = {
  model: {
    activeAdminTab: string;
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
};

export default function CustomersPanel({ model }: CustomersPanelProps) {
  const {
    activeAdminTab,
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


    </>
  );
}
