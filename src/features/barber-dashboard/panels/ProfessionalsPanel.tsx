import React from "react";
import type { Professional } from "../../../types/app";

export type ProfessionalsPanelModel = {
  activeAdminTab: string;
  addProfessional: () => void;
  cloudSaving: string;
  professionals: Professional[];
  removeProfessional: (index: number) => void;
  saveProfessionalsToCloud: () => void;
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
    professionals,
    removeProfessional,
    saveProfessionalsToCloud,
    updateProfessional,
  } = model;

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


    </>
  );
}
