import React from "react";
import type { Service } from "../../../types/app";

export type ServicesPanelModel = {
  activeAdminTab: string;
  addService: () => void;
  cloudSaving: string;
  isServiceDeleted: (service: Service) => boolean;
  removeService: (index: number) => void;
  saveServicesToCloud: () => void;
  services: Service[];
  updateService: (index: number, field: keyof Service | string, value: unknown) => void;
};

type ServicesPanelProps = {
  model: ServicesPanelModel;
};

export default function ServicesPanel({ model }: ServicesPanelProps) {
  const {
    activeAdminTab,
    addService,
    cloudSaving,
    isServiceDeleted,
    removeService,
    saveServicesToCloud,
    services,
    updateService,
  } = model;

  const visibleServices = services
    .map((service, index) => ({ ...service, originalIndex: index }))
    .filter((service) => !isServiceDeleted(service));

  const activeCount = visibleServices.filter((service) => service.active).length;

  return (
    <>
      <section className={activeAdminTab === "services" ? "card servicesPanelCard" : "hiddenPanel"}>
        <div className="panelHero compactPanelHero">
          <div>
            <span>Catálogo</span>
            <h2>Serviços</h2>
            <p>Configure nome, duração e valor. A agenda usa esses tempos para calcular horários reais.</p>
          </div>
          <div className="panelHeroMetric">
            <span>Ativos</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="serviceAdminGrid">
          {visibleServices.map((service) => (
            <article className={service.active ? "adminItem serviceAdminCard activeServiceAdminCard" : "adminItem serviceAdminCard"} key={service.id || service.originalIndex}>
              <div className="serviceAdminHeader">
                <div>
                  <span>{service.active ? "Disponível para cliente" : "Oculto no agendamento"}</span>
                  <strong>{service.name || "Serviço sem nome"}</strong>
                </div>
                <button
                  type="button"
                  className={service.active ? "statusPill activeStatus" : "statusPill"}
                  onClick={() => updateService(service.originalIndex, "active", !service.active)}
                >
                  {service.active ? "Ativo" : "Inativo"}
                </button>
              </div>

              <div className="serviceAdminMetrics">
                <div>
                  <span>Tempo</span>
                  <strong>{Number(service.duration || 0)} min</strong>
                </div>
                <div>
                  <span>Preço</span>
                  <strong>R$ {Number(service.price || 0).toLocaleString("pt-BR")}</strong>
                </div>
              </div>

              <label>Nome do serviço</label>
              <input
                value={service.name}
                onChange={(event) => updateService(service.originalIndex, "name", event.target.value)}
              />

              <div className="timePair serviceAdminInputs">
                <div>
                  <label>Tempo (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={service.duration}
                    onChange={(event) => updateService(service.originalIndex, "duration", event.target.value)}
                  />
                </div>
                <div>
                  <label>Preço</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={service.price}
                    onChange={(event) => updateService(service.originalIndex, "price", event.target.value)}
                  />
                </div>
              </div>

              <div className="serviceAdminActions">
                <button
                  type="button"
                  className={service.active ? "outline" : "selected"}
                  onClick={() => updateService(service.originalIndex, "active", !service.active)}
                >
                  {service.active ? "Desativar" : "Ativar"}
                </button>
                <button type="button" className="dangerButton" onClick={() => removeService(service.originalIndex)}>
                  Excluir serviço
                </button>
              </div>
            </article>
          ))}
        </div>

        <div className="panelSaveBar">
          <button type="button" className="black" onClick={addService}>
            Adicionar serviço
          </button>
          <button type="button" className="green" onClick={saveServicesToCloud}>
            {cloudSaving === "services" ? "Salvando serviços..." : "Salvar serviços"}
          </button>
        </div>
      </section>
    </>
  );
}
