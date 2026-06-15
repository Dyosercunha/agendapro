import React from "react";
import { monthlyStatusLabels, statusOptions } from "../../../lib/commercial";
import type {
  AccessAccount,
  AdminRole,
  Barbershop,
  PlanKey,
  PlanOption,
  SubscriptionStatus,
} from "../../../types/app";

export type PasswordForm = {
  confirm: string;
  next: string;
};

export type AccountBusiness = Barbershop & {
  monthlyStatus?: SubscriptionStatus;
  nextBillingDate?: string;
  ownerEmail?: string;
  plan?: PlanKey | string;
  slug?: string;
};

export type AccessAccountField = "active" | "email" | "password" | "passwordConfirm" | "role";

export type AccountPanelModel = {
  accessAccounts: AccessAccount[];
  accessEditorKey: (account: AccessAccount, index: number) => string;
  activeAdminTab: string;
  addAccessAccount: () => void;
  adminPanelLink: string;
  business: AccountBusiness;
  canManageAccessAccounts: boolean;
  canManageBilling: boolean;
  cloudSaving: string;
  copyText: (text: string) => void;
  currentPlan: PlanOption;
  formatDateOnly: (date?: string) => string;
  isDeveloperRole: boolean;
  isPlatformDeveloperEmail: (value?: string) => boolean;
  isUuid: (value?: string) => boolean;
  normalizeRole: (role?: string) => AdminRole;
  passwordEditorOpen: Record<string, boolean>;
  passwordForm?: PasswordForm;
  passwordMessage: string;
  passwordSaving: string;
  planOptions: PlanOption[];
  publicScheduleLink: string;
  removeAccessAccount: (index: number) => void;
  saveAccessAccountsToCloud: () => void;
  saveBusinessToCloud: () => void;
  setAccessPasswordEditor: (index: number, account: AccessAccount, open: boolean) => void;
  setBusiness: React.Dispatch<React.SetStateAction<AccountBusiness>>;
  setPasswordForm: React.Dispatch<React.SetStateAction<PasswordForm>>;
  updateAccessAccount: (index: number, field: AccessAccountField, value: boolean | string) => void;
  updateBusinessSlug: (value: string) => void;
  updateOwnPassword: () => void;
};

type AccountPanelProps = {
  model: AccountPanelModel;
};

export default function AccountPanel({ model }: AccountPanelProps) {
  const {
    accessAccounts,
    accessEditorKey,
    activeAdminTab,
    addAccessAccount,
    adminPanelLink,
    business,
    canManageAccessAccounts,
    canManageBilling,
    cloudSaving,
    copyText,
    currentPlan,
    formatDateOnly,
    isDeveloperRole,
    isPlatformDeveloperEmail,
    isUuid,
    normalizeRole,
    passwordForm = { next: "", confirm: "" },
    passwordEditorOpen,
    passwordMessage,
    passwordSaving,
    planOptions,
    publicScheduleLink,
    removeAccessAccount,
    saveAccessAccountsToCloud,
    saveBusinessToCloud,
    setAccessPasswordEditor,
    setBusiness,
    setPasswordForm,
    updateOwnPassword,
    updateAccessAccount,
    updateBusinessSlug,
  } = model;

  const monthlyStatus: SubscriptionStatus = business.monthlyStatus || "active";
  const monthlyStatusText = monthlyStatusLabels[monthlyStatus] || monthlyStatusLabels.active;
  const activeAccessCount = accessAccounts.filter((account) => account.active).length;
  const activeOwnerAccessCount = accessAccounts.filter(
    (account) =>
      account.active !== false &&
      normalizeRole(account.role) === "dono" &&
      !isPlatformDeveloperEmail(account.email)
  ).length;

  function isOnlyActiveOwnerAccess(account: AccessAccount) {
    return (
      account.active !== false &&
      normalizeRole(account.role) === "dono" &&
      !isPlatformDeveloperEmail(account.email) &&
      activeOwnerAccessCount <= 1
    );
  }

  function handlePlanSelection(planId: PlanKey | string) {
    if (canManageBilling) {
      setBusiness({ ...business, plan: planId });
      return;
    }

    if (business.plan === planId) return;

    setBusiness({
      ...business,
      plan: planId,
      monthlyStatus: "pending",
    });
  }

  return (
    <>
      <section className={activeAdminTab === "account" ? "card accountCard accountPanelCard" : "hiddenPanel"}>
        <div className="panelHero accountPanelHero">
          <div>
            <span>Conta e segurança</span>
            <h2>Conta</h2>
            <p>
              Gerencie links oficiais, senha, acessos e mensalidade sem misturar com a operação da agenda.
            </p>
          </div>
          <div className="panelHeroMetric">
            <span>{canManageBilling ? "Gestão" : "Plano atual"}</span>
            <strong>{currentPlan.name}</strong>
          </div>
        </div>

        <div className="accountSectionBlock accountIdentityBlock">
          <div className="accountSectionHeader">
            <div>
              <span>App da barbearia</span>
              <strong>{business.slug || "barbearia"}</strong>
            </div>
            <small>Link público e painel protegido</small>
          </div>

          <p className="accountSectionText">
            Cada barbearia tem um identificador próprio. O cliente usa o link de agendamento; o responsável
            entra pelo painel protegido.
          </p>

          <div className="accountFieldGrid">
            <div className="accountInputCard">
              <label>E-mail responsável</label>
              <input
                type="email"
                value={business.ownerEmail || ""}
                disabled={!isDeveloperRole}
                onChange={(event) => setBusiness({ ...business, ownerEmail: event.target.value })}
              />
              <small>{isDeveloperRole ? "Somente desenvolvedor altera o dono." : "Definido pela plataforma."}</small>
            </div>

            <div className="accountInputCard">
              <label>Identificador do link</label>
              <input
                value={business.slug || ""}
                disabled={!isDeveloperRole}
                onChange={(event) => updateBusinessSlug(event.target.value)}
                placeholder="master-barbearia"
              />
              <small>Esse texto monta os links da agenda e do painel.</small>
            </div>
          </div>

          <div className="accountCopyGrid">
            <article className="accountCopyCard">
              <span>Link para divulgar</span>
              <strong>{publicScheduleLink}</strong>
              <button type="button" className="black" onClick={() => copyText(publicScheduleLink)}>
                Copiar link de agendamento
              </button>
            </article>

            <article className="accountCopyCard">
              <span>Link do painel</span>
              <strong>{adminPanelLink}</strong>
              <button type="button" className="outline" onClick={() => copyText(adminPanelLink)}>
                Copiar link do painel
              </button>
            </article>
          </div>
        </div>

        <div className="passwordPanel accountSectionBlock">
          <div className="accountSectionHeader">
            <div>
              <span>Segurança</span>
              <strong>Minha senha</strong>
            </div>
            <small>Acesso atual</small>
          </div>

          <p className="accountSectionText">
            Altere aqui a senha do e-mail que está logado neste painel. Para trocar a senha de outro acesso,
            use a lista abaixo.
          </p>

          <div className="accountFieldGrid">
            <div>
              <label>Nova senha</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.next}
                placeholder="mínimo 6 caracteres"
                onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
              />
            </div>
            <div>
              <label>Confirmar nova senha</label>
              <input
                type="password"
                autoComplete="new-password"
                value={passwordForm.confirm}
                placeholder="repita a nova senha"
                onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
              />
            </div>
          </div>

          {passwordMessage && <p className="adminNote">{passwordMessage}</p>}

          <button
            type="button"
            className="black"
            disabled={passwordSaving === "password"}
            onClick={updateOwnPassword}
          >
            {passwordSaving === "password" ? "Salvando senha..." : "Alterar minha senha"}
          </button>
        </div>

        <div className="accountSectionBlock">
          <div className="accessHeader">
            <div>
              <span>Acessos ao painel</span>
              <strong>{activeAccessCount} ativos</strong>
            </div>
            {canManageAccessAccounts && (
              <button type="button" onClick={addAccessAccount}>
                Adicionar acesso
              </button>
            )}
          </div>

          <div className="accessRulesPanel">
            <span>E-mails aceitos</span>
            <strong>@gmail.com e @agendapro.com cadastrados</strong>
            <p>
              Somente contas adicionadas nesta lista conseguem abrir o painel da barbearia. Desenvolvedor
              entra em qualquer barbearia; dono e funcionário ficam limitados a este painel.
            </p>
          </div>

          <div className="accessList">
            {accessAccounts.map((account, index) => {
              const editorKey = accessEditorKey(account, index);
              const needsInitialPassword = !account.fixed && !isUuid(account.id);
              const isPasswordOpen = Boolean(passwordEditorOpen[editorKey]) || needsInitialPassword;
              const protectsLastOwner = isOnlyActiveOwnerAccess(account);
              const passwordLabel = needsInitialPassword
                ? "Senha inicial deste acesso"
                : "Nova senha deste acesso";

              return (
                <div className="accessItem" key={account.id || index}>
                  <div className="accessItemHeader">
                    <div>
                      <span className="accessRoleBadge">{account.role || "Acesso"}</span>
                      <strong>{account.email || "Novo acesso"}</strong>
                      <p>
                        {account.fixed
                          ? "Acesso principal protegido."
                          : account.active
                            ? "Liberado para entrar neste painel."
                            : "Acesso pausado para este painel."}
                      </p>
                    </div>
                    <span className={account.active ? "accessState activeAccessState" : "accessState"}>
                      {account.active ? "Ativo" : "Inativo"}
                    </span>
                  </div>

                  <div className="accessEmailField">
                    <label>E-mail de acesso</label>
                    <input
                      type="email"
                      value={account.email}
                      disabled={account.fixed}
                      placeholder="funcionario@gmail.com"
                      onChange={(event) => updateAccessAccount(index, "email", event.target.value)}
                    />
                  </div>

                  {!needsInitialPassword && (
                    <div className="accessPasswordActions">
                      <button
                        type="button"
                        className="outline"
                        onClick={() => setAccessPasswordEditor(index, account, !isPasswordOpen)}
                      >
                        {isPasswordOpen ? "Cancelar alteração de senha" : "Alterar senha deste e-mail"}
                      </button>
                    </div>
                  )}

                  {isPasswordOpen && (
                    <div className="accessPasswordBox">
                      <label>{passwordLabel}</label>
                      <input
                        type="password"
                        value={account.password || ""}
                        placeholder="mínimo 6 caracteres"
                        onChange={(event) => updateAccessAccount(index, "password", event.target.value)}
                      />

                      <label>Confirmar senha</label>
                      <input
                        type="password"
                        value={account.passwordConfirm || ""}
                        placeholder="repita a senha"
                        onChange={(event) =>
                          updateAccessAccount(index, "passwordConfirm", event.target.value)
                        }
                      />

                      <p className="hint">
                        Esta senha será aplicada somente ao e-mail {account.email || "deste acesso"} ao
                        salvar os acessos.
                      </p>
                    </div>
                  )}

                  <div className="accessControlsGrid">
                    <div>
                      <label>Função</label>
                      <select
                        value={account.role}
                        disabled={account.fixed || protectsLastOwner}
                        onChange={(event) => updateAccessAccount(index, "role", event.target.value)}
                      >
                        <option value="Dono">Dono</option>
                        <option value="Funcionário">Funcionário</option>
                        {(isDeveloperRole || normalizeRole(account.role) === "desenvolvedor") && (
                          <option value="Desenvolvedor">Desenvolvedor</option>
                        )}
                      </select>
                    </div>
                    <div>
                      <label>Status</label>
                      <button
                        type="button"
                        className={account.active ? "selected" : ""}
                        disabled={account.fixed || protectsLastOwner}
                        onClick={() => updateAccessAccount(index, "active", !account.active)}
                      >
                        {account.active ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  </div>

                  {account.fixed && (
                    <p className="hint">Acesso principal protegido para esta barbearia.</p>
                  )}

                  {protectsLastOwner && (
                    <p className="hint">
                      Este é o último Dono ativo. Cadastre outro Dono antes de alterar ou remover este acesso.
                    </p>
                  )}

                  {!account.fixed && !protectsLastOwner && (
                    <button type="button" className="dangerButton" onClick={() => removeAccessAccount(index)}>
                      Remover acesso
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canManageAccessAccounts && (
            <button type="button" className="green accountWideAction" onClick={saveAccessAccountsToCloud}>
              {cloudSaving === "access" ? "Salvando acessos..." : "Salvar acessos"}
            </button>
          )}
        </div>

        <div className="accountSectionBlock accountBillingBlock">
          <div className="accountSectionHeader">
            <div>
              <span>{monthlyStatus === "pending" && !canManageBilling ? "Plano solicitado" : "Plano atual"}</span>
              <strong>{currentPlan.name}</strong>
            </div>
            <small>{currentPlan.price}</small>
          </div>

          <div className="planGrid">
            {planOptions.map((plan) => (
              <button
                type="button"
                key={plan.id}
                className={business.plan === plan.id ? "planCard activePlan" : "planCard"}
                onClick={() => handlePlanSelection(plan.id)}
              >
                <span>{plan.name}</span>
                <strong>{plan.price}</strong>
                <small>{plan.description}</small>
                {plan.features?.length ? (
                  <ul className="planBenefits">
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                ) : null}
              </button>
            ))}
          </div>

          {canManageBilling ? (
            <div className="billingEditor">
              <div className="accountFieldGrid">
                <div>
                  <label>Status da mensalidade</label>
                  <select
                    value={business.monthlyStatus || "active"}
                    onChange={(event) =>
                      setBusiness({ ...business, monthlyStatus: event.target.value as SubscriptionStatus })
                    }
                  >
                    <option value="pending">Pagamento pendente</option>
                    {statusOptions.filter((item) => item.value !== "archived").map((item) => (
                      <option key={item.value} value={item.value}>
                        {monthlyStatusLabels[item.value] || item.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label>Próxima cobrança</label>
                  <input
                    type="date"
                    value={business.nextBillingDate || ""}
                    onChange={(event) => setBusiness({ ...business, nextBillingDate: event.target.value })}
                  />
                </div>
              </div>

              <p className="adminNote">Somente a plataforma altera status e vencimento da mensalidade.</p>

              <button type="button" className="green" onClick={saveBusinessToCloud}>
                {cloudSaving === "business" ? "Salvando conta..." : "Salvar conta"}
              </button>
            </div>
          ) : (
            <div className="billingViewer">
              <div className="billingReadout">
                <div>
                  <span>Status da mensalidade</span>
                  <strong>{monthlyStatusText}</strong>
                </div>
                <div>
                  <span>Próxima cobrança</span>
                  <strong>{formatDateOnly(business.nextBillingDate)}</strong>
                </div>
              </div>

              <p className="adminNote">
                Você pode solicitar troca de plano. A alteração fica pendente até a aprovação da plataforma
                ou confirmação do pagamento.
              </p>

              <button type="button" className="green" onClick={saveBusinessToCloud}>
                {cloudSaving === "business" ? "Salvando solicitação..." : "Salvar solicitação de plano"}
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
