import React, { useState } from "react";
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

function initials(name = "") {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "?";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function readImageFile(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Não foi possível carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

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

  const [openCommissionIndex, setOpenCommissionIndex] = useState<number | null>(null);
  const activeServices = services.filter((service) => service.active && !service.deleted_at);

  async function handleProfessionalPhoto(index: number, file?: File | null) {
    if (!file) return;
    const image = await readImageFile(file);
    updateProfessional(index, "photoUrl", image);
  }

  return (
    <>
      <section className={activeAdminTab === "professionals" ? "card" : "hiddenPanel"}>
        <h2>Profissionais</h2>

        {professionals.map((item, index) => {
          const photo = item.photoUrl || item.imageUrl || item.avatarUrl || "";
          const commissionOpen = openCommissionIndex === index;
          const defaultCommission = Number(item.commissionPercent || 0);

          return (
            <div
              className={item.fixed ? "adminItem barberItem fixedProfessionalItem" : "adminItem barberItem"}
              key={index}
            >
              <div className="barberHeader">
                {!item.fixed && (
                  <div className={photo ? "professionalPhoto hasPhoto" : "professionalPhoto"}>
                    {photo ? <img src={photo} alt={item.name || "Profissional"} /> : initials(item.name)}
                  </div>
                )}

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

              {!item.fixed && (
                <>
                  <div className="professionalFieldsGrid">
                    <div>
                      <label>Nome</label>
                      <input
                        value={item.name}
                        onChange={(event) => updateProfessional(index, "name", event.target.value)}
                      />
                    </div>

                    <div>
                      <label>Foto do profissional</label>
                      <input
                        value={photo}
                        onChange={(event) => updateProfessional(index, "photoUrl", event.target.value)}
                        placeholder="https://site.com/foto.jpg"
                      />
                    </div>
                  </div>

                  <div className="professionalPhotoActions">
                    <label className="professionalUploadButton">
                      Enviar foto
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleProfessionalPhoto(index, event.target.files?.[0])}
                      />
                    </label>
                    {photo && (
                      <button
                        type="button"
                        className="outline"
                        onClick={() => updateProfessional(index, "photoUrl", "")}
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                </>
              )}

              {item.fixed && (
                <p className="hint fixedProfessionalHint">
                  Esta opção aparece para o cliente só quando houver mais de um profissional ativo.
                </p>
              )}

              {!item.fixed && (
                <div className={commissionOpen ? "commissionConfig commissionConfigOpen" : "commissionConfig commissionConfigClosed"}>
                  <button
                    type="button"
                    className="commissionToggle"
                    onClick={() => setOpenCommissionIndex(commissionOpen ? null : index)}
                  >
                    <div>
                      <span>Comissões</span>
                      <strong>{defaultCommission > 0 ? `${defaultCommission}% padrão` : "Recurso Premium"}</strong>
                    </div>
                    <small>{commissionOpen ? "Ocultar" : "Configurar"}</small>
                  </button>

                  {commissionOpen && (
                    <div className="commissionConfigBody">
                      <div className="commissionHeader">
                        <div>
                          <span>Comissões</span>
                          <strong>Plano Premium</strong>
                        </div>
                        <small>Libere e ative em Melhorias para configurar percentuais.</small>
                      </div>

                      <label>Percentual padrão do profissional (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={defaultCommission}
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
          );
        })}

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
