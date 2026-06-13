import React, { useState } from "react";
import type { Professional, Service } from "../../../types/app";

export type ProfessionalsPanelModel = {
  activeAdminTab: string;
  addProfessional: () => void;
  cloudSaving: string;
  commissionsAvailable: boolean;
  handleProfessionalPhotoUpload?: (index: number, event: React.ChangeEvent<HTMLInputElement>) => void;
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
    commissionsAvailable,
    handleProfessionalPhotoUpload,
    money,
    professionals,
    removeProfessional,
    saveProfessionalsToCloud,
    services,
    updateProfessional,
  } = model;
  const [openCommissionCards, setOpenCommissionCards] = useState<Record<string, boolean>>({});

  const activeServices = services.filter((service) => service.active && !service.deleted_at);

  function professionalInitials(name: string) {
    const parts = String(name || "Profissional").trim().split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || "P") + (parts[1]?.[0] || "");
  }

  function commissionEditorKey(item: Professional, index: number) {
    return item.id || `${item.name || "professional"}-${index}`;
  }

  function toggleCommissionCard(key: string) {
    setOpenCommissionCards((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  return (
    <>
      <section className={activeAdminTab === "professionals" ? "card professionalsPanelCard" : "hiddenPanel"}>
        <div className="panelHero compactPanelHero">
          <div>
            <span>Equipe</span>
            <h2>Profissionais</h2>
            <p>
              Cadastre quem atende, adicione foto para a tela do cliente e abra comissões apenas
              quando precisar configurar o recurso Premium.
            </p>
          </div>
          <button type="button" className="heroActionButton" onClick={addProfessional}>
            Adicionar
          </button>
        </div>

        <div className="professionalAdminGrid">
          {professionals.map((item, index) => {
            const commissionKey = commissionEditorKey(item, index);
            const commissionOpen = Boolean(openCommissionCards[commissionKey]);

            return (
              <article
                className={
                  item.fixed
                    ? "adminItem barberItem professionalAdminCard firstAvailableAdminCard"
                    : "adminItem barberItem professionalAdminCard"
                }
                key={item.id || `${item.name}-${index}`}
              >
                <div className="barberHeader professionalAdminHeader">
                  <div className="professionalAdminTitle">
                    <span className={item.photoUrl ? "professionalAvatar professionalAvatarPhoto" : "professionalAvatar"}>
                      {item.photoUrl ? <img src={item.photoUrl} alt={item.name} /> : professionalInitials(item.name)}
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {item.fixed
                          ? item.active
                            ? "Escolha automática para distribuir horários entre profissionais."
                            : "Oculto para o cliente. Ative se quiser oferecer escolha automática."
                          : item.active
                            ? "Disponível para agendamentos."
                            : "Oculto para o cliente."}
                      </p>
                    </div>
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

                <div className={item.fixed ? "professionalAdminFields singleProfessionalField" : "professionalAdminFields"}>
                  <div>
                    <label>Nome</label>
                    <input
                      value={item.name}
                      disabled={item.fixed}
                      onChange={(event) => updateProfessional(index, "name", event.target.value)}
                    />
                  </div>

                  {!item.fixed && (
                    <div>
                      <label>Foto do profissional</label>
                      <input
                        value={item.photoUrl || ""}
                        placeholder="Cole a URL da foto ou envie uma imagem"
                        onChange={(event) => updateProfessional(index, "photoUrl", event.target.value)}
                      />
                    </div>
                  )}
                </div>

                {!item.fixed && (
                  <div className="professionalPhotoTools">
                    <label className="fileButton">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(event) => handleProfessionalPhotoUpload?.(index, event)}
                      />
                      Enviar foto
                    </label>
                    {item.photoUrl && (
                      <button
                        type="button"
                        className="outline"
                        onClick={() => updateProfessional(index, "photoUrl", "")}
                      >
                        Remover foto
                      </button>
                    )}
                  </div>
                )}

                {item.fixed && (
                  <p className="hint firstAvailableHint">
                    Esta opção aparece para o cliente só quando houver mais de um profissional ativo.
                  </p>
                )}

                {!item.fixed && (
                  <div className={commissionsAvailable ? "commissionFeatureCard" : "commissionFeatureCard lockedCommissionFeature"}>
                    <div className="commissionFeatureSummary">
                      <div>
                        <span>Comissões</span>
                        <strong>{commissionsAvailable ? "Plano Premium ativo" : "Plano Premium"}</strong>
                        <p>Configure percentual padrão e comissão por serviço somente quando precisar.</p>
                      </div>
                      <small>
                        {commissionsAvailable
                          ? "Relatório por profissional e serviço."
                          : "Libere e ative em Melhorias para configurar percentuais."}
                      </small>
                    </div>

                    <button
                      type="button"
                      className={commissionOpen ? "outline activeCommissionToggle" : "outline"}
                      onClick={() => toggleCommissionCard(commissionKey)}
                    >
                      {commissionOpen ? "Fechar comissões" : "Abrir comissões"}
                    </button>

                    {commissionOpen && (
                      <div className={commissionsAvailable ? "commissionConfig" : "commissionConfig lockedCommission"}>
                        <div className="commissionHeader">
                          <div>
                            <span>Configuração</span>
                            <strong>{commissionsAvailable ? "Percentuais liberados" : "Bloqueado"}</strong>
                          </div>
                          <small>
                            {commissionsAvailable
                              ? "Aplique padrão ou ajuste por serviço."
                              : "Ative Comissões na aba Melhorias."}
                          </small>
                        </div>

                        <label>Percentual padrão do profissional (%)</label>
                        <input
                          type="number"
                          disabled={!commissionsAvailable}
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
                                    disabled={!commissionsAvailable}
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={currentCommission}
                                    onChange={(event) =>
                                      updateProfessional(index, "commissionByService", {
                                        ...(item.commissionByService || {}),
                                        [service.name]: Math.max(0, Math.min(100, Number(event.target.value) || 0)),
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
                  <button type="button" className="dangerButton" onClick={() => removeProfessional(index)}>
                    Remover profissional
                  </button>
                )}
              </article>
            );
          })}
        </div>

        <div className="panelSaveBar">
          <button type="button" className="black" onClick={addProfessional}>
            Adicionar profissional
          </button>
          <button type="button" className="green" onClick={saveProfessionalsToCloud}>
            {cloudSaving === "professionals" ? "Salvando profissionais..." : "Salvar profissionais"}
          </button>
        </div>
      </section>
    </>
  );
}
