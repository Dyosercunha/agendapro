import React from "react";
import type { Professional, Service } from "../../../types/app";

export type ProfessionalsPanelModel = {
  activeAdminTab: string;
  addProfessional: () => void;
  cloudSaving: string;
  money: (value?: number) => string;
  professionals: Professional[];
  removeProfessional: (index: number) => void;
  saveProfessionalsToCloud: () => void;
  services: Service[];
  updateProfessional: (index: number, field: keyof Professional | string, value: unknown) => void;
};

type ProfessionalsPanelProps = {
  model: ProfessionalsPanelModel;
};

export default function ProfessionalsPanel({ model }: ProfessionalsPanelProps) {
  const {
    activeAdminTab,
    addProfessional,
    cloudSaving,
    money,
    professionals,
    removeProfessional,
    saveProfessionalsToCloud,
    services,
    updateProfessional,
  } = model;

  const activeServices = services.filter((service) => service.active && !service.deleted_at);

  return (
    <>
      <section className={activeAdminTab === "professionals" ? "card" : "hiddenPanel"}>
        <h2>Profissionais</h2>

        {professionals.map((item, index) => (
          <div className="adminItem barberItem" key={index}>
            <div className="barberHeader">
              <div>
                <strong>{item.name}</strong>
                <p>
                  {item.fixed
                    ? item.active
                      ? "Escolha automática para distribuir horários entre profissionais"
                      : "Oculto para o cliente. Ative se quiser oferecer escolha automática"
                    : item.active
                      ? "Disponível para agendamentos"
                      : "Oculto para o cliente"}
                </p>
              </div>
              <button
                type="button"
                className={item.active ? "statusPill activeStatus" : "statusPill"}
                onClick={() => updateProfessional(index, "active", !item.active)}
              >
                {item.active
                  ? item.fixed
                    ? "Primeiro disponível ativo"
                    : "Ativo"
                  : item.fixed
                    ? "Primeiro disponível inativo"
                    : "Inativo"}
              </button>
            </div>

            <label>Nome</label>
            <input
              value={item.name}
              disabled={item.fixed}
              onChange={(event) => updateProfessional(index, "name", event.target.value)}
            />

            {item.fixed && (
              <p className="hint">
                Esta opção aparece para o cliente só quando houver mais de um profissional ativo.
              </p>
            )}

            {!item.fixed && (
              <div className="commissionConfig">
                <div className="commissionHeader">
                  <div>
                    <span>Comissões</span>
                    <strong>Recurso Premium</strong>
                  </div>
                  <small>Relatório por profissional e por serviço.</small>
                </div>

                <label>Percentual padrão do profissional (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={Number(item.commissionPercent || 0)}
                  onChange={(event) =>
                    updateProfessional(
                      index,
                      "commissionPercent",
                      Math.max(0, Math.min(100, Number(event.target.value) || 0))
                    )
                  }
                />

                {activeServices.length > 0 && (
                  <div className="commissionServiceList">
                    <span>Comissão por serviço</span>
                    {activeServices.map((service) => {
                      const currentCommission = Number(
                        item.commissionByService?.[service.name] ?? item.commissionPercent ?? 0
                      );

                      return (
                        <label className="commissionServiceRow" key={service.id || service.name}>
                          <div>
                            <strong>{service.name}</strong>
                            <small>{money(service.price)}</small>
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={currentCommission}
                            onChange={(event) =>
                              updateProfessional(index, "commissionByService", {
                                ...(item.commissionByService || {}),
                                [service.name]: Math.max(
                                  0,
                                  Math.min(100, Number(event.target.value) || 0)
                                ),
                              })
                            }
                          />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!item.fixed && (
              <button
                type="button"
                className="dangerButton"
                onClick={() => removeProfessional(index)}
              >
                Remover profissional
              </button>
            )}
          </div>
        ))}

        <button type="button" className="black" onClick={addProfessional}>
          Adicionar profissional
        </button>

        <button type="button" className="green" onClick={saveProfessionalsToCloud}>
          {cloudSaving === "professionals" ? "Salvando profissionais..." : "Salvar profissionais"}
        </button>
      </section>
    </>
  );
}
