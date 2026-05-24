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
        <section className={activeAdminTab === "account" ? "card accountCard" : "hiddenPanel"}>
          <div className="sectionTitle">
            <h2>Conta</h2>
            <span>{canManageBilling ? "Mensalidade e link" : "Renovação e link"}</span>
          </div>

          <div className="accountHero">
            <span>App da barbearia</span>
            <strong>{business.slug || "barbearia"}</strong>
            <p>
              Cada barbearia tem um app próprio, definido pelo identificador do link.
              O cliente acessa o agendamento; o responsável acessa o painel protegido.
            </p>
          </div>

          <label>E-mail responsável</label>
          <input
            type="email"
            value={business.ownerEmail || ""}
            disabled={!isDeveloperRole}
            onChange={(event) => setBusiness({ ...business, ownerEmail: event.target.value })}
          />

          <label>Identificador do link</label>
          <input
            value={business.slug || ""}
            disabled={!isDeveloperRole}
            onChange={(event) => updateBusinessSlug(event.target.value)}
            placeholder="agenda-pro"
          />

          <label>Link para divulgar</label>
          <input value={publicScheduleLink} readOnly />

          <button type="button" className="black" onClick={() => copyText(publicScheduleLink)}>
            Copiar link de agendamento
          </button>

          <label>Link do painel</label>
          <input value={adminPanelLink} readOnly />

          <button type="button" className="outline" onClick={() => copyText(adminPanelLink)}>
            Copiar link do painel
          </button>

          <div className="passwordPanel">
            <div className="sectionTitle">
              <h3>Minha senha</h3>
              <span>Acesso atual</span>
            </div>

            <p className="hint">
              Altere aqui a senha do e-mail que está logado neste painel. Para trocar a senha de outro
              acesso, use a lista abaixo.
            </p>

            <label>Nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.next}
              placeholder="mínimo 6 caracteres"
              onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })}
            />

            <label>Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={passwordForm.confirm}
              placeholder="repita a nova senha"
              onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })}
            />

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

          <div className="accessHeader">
            <div>
              <span>Acessos ao painel</span>
              <strong>{accessAccounts.filter((account) => account.active).length} ativos</strong>
            </div>
            {canManageAccessAccounts && (
              <button type="button" onClick={addAccessAccount}>Adicionar</button>
            )}
          </div>

          <div className="accessList">
            {accessAccounts.map((account, index) => {
              const editorKey = accessEditorKey(account, index);
              const needsInitialPassword = !account.fixed && !isUuid(account.id);
              const isPasswordOpen = Boolean(passwordEditorOpen[editorKey]) || needsInitialPassword;
              const passwordLabel = needsInitialPassword
                ? "Senha inicial deste acesso"
                : "Nova senha deste acesso";

              return (
                <div className="accessItem" key={account.id || index}>
                  <label>E-mail de acesso</label>
                  <input
                    type="email"
                    value={account.email}
                    disabled={account.fixed}
                    placeholder="funcionario@barbearia.com"
                    onChange={(event) => updateAccessAccount(index, "email", event.target.value)}
                  />

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

                  <div className="timePair">
                    <div>
                      <label>Função</label>
                      <select
                        value={account.role}
                        disabled={account.fixed}
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
                      <button type="button"
                        className={account.active ? "selected" : ""}
                        disabled={account.fixed}
                        onClick={() => updateAccessAccount(index, "active", !account.active)}
                      >
                        {account.active ? "Ativo" : "Inativo"}
                      </button>
                    </div>
                  </div>

                  {account.fixed && (
                    <p className="hint">Acesso principal protegido para esta barbearia.</p>
                  )}

                  {!account.fixed && (
                    <button type="button" className="dangerButton" onClick={() => removeAccessAccount(index)}>
                      Remover acesso
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {canManageAccessAccounts && (
            <button type="button" className="green" onClick={saveAccessAccountsToCloud}>
              {cloudSaving === "access" ? "Salvando acessos..." : "Salvar acessos"}
            </button>
          )}

          <div className="planHeader">
            <div>
              <span>{monthlyStatus === "pending" && !canManageBilling ? "Plano solicitado" : "Plano atual"}</span>
              <strong>{currentPlan.name}</strong>
            </div>
            <b>{currentPlan.price}</b>
          </div>

          <div className="planGrid">
            {planOptions.map((plan) => (
              <button type="button"
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
            <>
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

              <label>Próxima cobrança</label>
              <input
                type="date"
                value={business.nextBillingDate || ""}
                onChange={(event) => setBusiness({ ...business, nextBillingDate: event.target.value })}
              />

              <p className="adminNote">
                Somente a plataforma altera status e vencimento da mensalidade.
              </p>

              <button type="button" className="green" onClick={saveBusinessToCloud}>
                {cloudSaving === "business" ? "Salvando conta..." : "Salvar conta"}
              </button>
            </>
          ) : (
            <>
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
            </>
          )}
        </section>


    </>
  );
}
