import React from "react";
import {
  featureMinimumPlanLabel,
  planMeetsFeaturePlan,
} from "../../../lib/features";
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

  function isPlanAllowed(feature: FeatureDefinition) {
    return planMeetsFeaturePlan(business.plan, feature.minPlan);
  }

  const releasedCount = platformFeatures.filter((feature) => featureFlags[feature.key]?.released).length;
  const activeCount = platformFeatures.filter((feature) => {
    const state = featureFlags[feature.key];
    return Boolean(state?.released && state?.enabled && isPlanAllowed(feature));
  }).length;
  const blockedCount = Math.max(platformFeatures.length - releasedCount, 0);

  return (
    <>
      <section className={activeAdminTab === "improvements" ? "card improvementsPanelCard" : "hiddenPanel"}>
        <div className="improvementsHero">
          <div>
            <span>Central de recursos</span>
            <h2>Melhorias da barbearia</h2>
            <p>
              Controle o que fica liberado, ativo ou bloqueado nesta conta. O visual segue a mesma lógica do Painel Plataforma.
            </p>
          </div>
          <div className="improvementsPlanCard">
            <span>Plano atual</span>
            <strong>{currentPlan.name}</strong>
            <small>{canManageBilling ? "Você pode ativar o que estiver liberado." : "Liberação controlada pela plataforma."}</small>
          </div>
        </div>

        <div className="improvementsSummary">
          <div>
            <span>Ativas</span>
            <strong>{activeCount}</strong>
          </div>
          <div>
            <span>Liberadas</span>
            <strong>{releasedCount}</strong>
          </div>
          <div>
            <span>Bloqueadas</span>
            <strong>{blockedCount}</strong>
          </div>
        </div>

        <div className="featureGrid premiumFeatureGrid">
          {platformFeatures.map((feature) => {
            const featureState = featureFlags[feature.key] || {
              enabled: false,
              released: false,
            };
            const shortcut = featureShortcut(feature.key);
            const planAllowed = isPlanAllowed(feature);
            const minimumPlanLabel = featureMinimumPlanLabel(feature.minPlan);
            const canActivate =
              featureState.released &&
              planAllowed &&
              !isFutureOnlyFeature(feature.key);

            return (
              <article
                className={[
                  "featureCard premiumFeatureCard",
                  featureState.released ? "availableFeature" : "lockedFeature",
                  featureState.released && featureState.enabled && planAllowed ? "activeFeature" : "",
                  !planAllowed ? "planBlockedFeature" : "",
                ].join(" ")}
                key={feature.key}
              >
                <div className="featureHeader">
                  <strong>{feature.title}</strong>
                  <span>
                    {!planAllowed
                      ? `Plano ${minimumPlanLabel}`
                      : featureState.released
                      ? featureState.enabled
                        ? "Ativo"
                        : "Liberado"
                      : "Bloqueado"}
                  </span>
                </div>

                <p>{feature.description}</p>

                <div className="featureMetaGrid">
                  <div>
                    <span>Plano mínimo</span>
                    <strong>{minimumPlanLabel}</strong>
                  </div>
                  <div>
                    <span>Status</span>
                    <strong>
                      {featureState.released
                        ? featureState.enabled && planAllowed
                          ? "Em uso"
                          : "Disponível"
                        : "Travado"}
                    </strong>
                  </div>
                </div>

                <div className="featureDestination">
                  <span>
                    {!planAllowed
                      ? `Disponível a partir do plano ${minimumPlanLabel}`
                      : isFutureOnlyFeature(feature.key)
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
                    <button
                      type="button"
                      onClick={() => setFeatureRelease(feature.key, !featureState.released)}
                    >
                      {featureState.released ? "Bloquear recurso" : "Liberar recurso"}
                    </button>
                  ) : (
                    <button type="button" disabled>
                      {featureState.released ? "Liberado pela plataforma" : "Bloqueado pela plataforma"}
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={
                      !canActivate ||
                      feature.key === "pix" ||
                      feature.key === "auto_confirmation"
                    }
                    onClick={() =>
                      updateFeatureFlag(feature.key, "enabled", !featureState.enabled)
                    }
                  >
                    {featureState.enabled && planAllowed ? "Desativar na barbearia" : "Ativar na barbearia"}
                  </button>
                </div>

                {feature.key === "pix" && featureState.released && (
                  <button
                    type="button"
                    disabled={!planAllowed}
                    onClick={() => {
                      setBusiness({ ...business, pixEnabled: !business.pixEnabled });
                      updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
                    }}
                  >
                    {pixAvailable ? "PIX ativo no checkout" : "Ativar PIX no checkout"}
                  </button>
                )}

                {feature.key === "auto_confirmation" && featureState.released && (
                  <button
                    type="button"
                    disabled={!planAllowed}
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
                  <button
                    type="button"
                    className="featureShortcut"
                    disabled={!planAllowed || shortcut.disabled}
                    onClick={() => {
                      if (planAllowed && !shortcut.disabled && shortcut.tab) {
                        setAdminTab(shortcut.tab);
                      }
                    }}
                  >
                    {planAllowed ? shortcut.label : `Exige plano ${minimumPlanLabel}`}
                  </button>
                )}
              </article>
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
