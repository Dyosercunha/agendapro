import React from "react";
import type {
  AdminRole,
  Barbershop,
  FeatureDefinition,
  FeatureFlag,
  FeatureFlags,
  FeatureKey,
  PlanOption,
} from "../../../types/app";

export type FeatureShortcut = { disabled?: boolean; label: string; tab?: string };

export type ImprovementsPanelModel = {
  activeAdminTab: string;
  autoConfirmationFeatureEnabled: boolean;
  business: Barbershop;
  canManageBilling: boolean;
  cloudSaving: string;
  currentAdminRole: AdminRole | string;
  currentPlan: PlanOption;
  featureFlags: FeatureFlags;
  featureShortcut: (feature: FeatureKey | string) => FeatureShortcut;
  isFutureOnlyFeature: (feature: FeatureKey | string) => boolean;
  pixAvailable: boolean;
  platformFeatures: FeatureDefinition[];
  saveFeatureFlagsToCloud: () => void;
  setAdminTab: (tabId: string) => void;
  setBusiness: (business: Barbershop) => void;
  setFeatureRelease: (feature: FeatureKey | string, released: boolean) => void;
  updateFeatureFlag: (feature: FeatureKey | string, field: keyof FeatureFlag, value: boolean) => void;
};

type ImprovementsPanelProps = {
  model: ImprovementsPanelModel;
};

export default function ImprovementsPanel({ model }: ImprovementsPanelProps) {
  const {
    activeAdminTab,
    autoConfirmationFeatureEnabled,
    business,
    canManageBilling,
    cloudSaving,
    currentAdminRole,
    currentPlan,
    featureFlags,
    featureShortcut,
    isFutureOnlyFeature,
    pixAvailable,
    platformFeatures,
    saveFeatureFlagsToCloud,
    setAdminTab,
    setBusiness,
    setFeatureRelease,
    updateFeatureFlag,
  } = model;

  return (
    <>
        <section className={activeAdminTab === "improvements" ? "card" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Melhorias</h2>
            <span>Liberação da plataforma</span>
          </div>

          <p className="hint">
            {canManageBilling
              ? `Novos recursos começam bloqueados e são liberados por atualização ou pelo plano da mensalidade. Plano atual: ${currentPlan.name}.`
              : "Novos recursos começam bloqueados e são liberados pela plataforma quando estiverem disponíveis para esta conta."}
          </p>

          <div className="featureGrid">
            {platformFeatures.map((feature) => {
              const featureState = featureFlags[feature.key] || {
                enabled: false,
                released: false,
              };
              const shortcut = featureShortcut(feature.key);

              return (
                <div
                  className={[
                    "featureCard",
                    featureState.released ? "availableFeature" : "lockedFeature",
                    featureState.released && featureState.enabled ? "activeFeature" : "",
                  ].join(" ")}
                  key={feature.key}
                >
                <div className="featureHeader">
                  <strong>{feature.title}</strong>
                  <span>
                    {featureState.released
                      ? featureState.enabled
                        ? "Ativo"
                        : "Liberado"
                      : "Bloqueado"}
                  </span>
                </div>
                <p>{feature.description}</p>

                <div className="featureDestination">
                  <span>
                    {isFutureOnlyFeature(feature.key)
                      ? "Em preparação"
                      : featureState.released
                      ? featureState.enabled
                        ? shortcut.label
                        : "Liberado, aguardando ativação"
                      : "Aguardando liberação"}
                  </span>
                </div>

                <div className="featureActions">
                  {currentAdminRole === "desenvolvedor" ? (
                    <button type="button"
                      onClick={() => setFeatureRelease(feature.key, !featureState.released)}
                    >
                      {featureState.released ? "Bloquear recurso" : "Liberar recurso"}
                    </button>
                  ) : (
                    <button type="button" disabled>
                      {featureState.released ? "Liberado pela plataforma" : "Bloqueado pela plataforma"}
                    </button>
                  )}

                  <button type="button"
                    disabled={
                      !featureState.released ||
                      feature.key === "pix" ||
                      feature.key === "auto_confirmation" ||
                      isFutureOnlyFeature(feature.key)
                    }
                    onClick={() =>
                      updateFeatureFlag(feature.key, "enabled", !featureState.enabled)
                    }
                  >
                    {featureState.enabled ? "Desativar na barbearia" : "Ativar na barbearia"}
                  </button>
                </div>

                {feature.key === "pix" && featureState.released && (
                  <button type="button"
                    onClick={() => {
                      setBusiness({ ...business, pixEnabled: !business.pixEnabled });
                      updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    }}
                  >
                    {pixAvailable ? "PIX ativo no checkout" : "Ativar PIX no checkout"}
                  </button>
                )}

                {feature.key === "auto_confirmation" &&
                  featureState.released && (
                    <button type="button"
                      onClick={() => {
                        setBusiness({
                          ...business,
                          automaticConfirmationEnabled: !business.automaticConfirmationEnabled,
                        });
                        updateFeatureFlag(
                          "auto_confirmation",
                          "enabled",
                          !featureFlags.auto_confirmation?.enabled
                        );
                      }}
                    >
                      {autoConfirmationFeatureEnabled && business.automaticConfirmationEnabled
                        ? "Confirmação ativa"
                        : "Ativar confirmação"}
                    </button>
                  )}

                  {featureState.released && (
                    <button type="button"
                      className="featureShortcut"
                      disabled={shortcut.disabled}
                      onClick={() => {
                        if (!shortcut.disabled && shortcut.tab) {
                          setAdminTab(shortcut.tab);
                        }
                      }}
                    >
                      {shortcut.label}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="green" onClick={saveFeatureFlagsToCloud}>
            {cloudSaving === "features" ? "Salvando melhorias..." : "Salvar melhorias"}
          </button>
        </section>


    </>
  );
}
