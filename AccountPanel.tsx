// @ts-nocheck
import React from "react";

export default function AccountPanel({ model }) {
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
    passwordEditorOpen,
    planOptions,
    publicScheduleLink,
    removeAccessAccount,
    saveAccessAccountsToCloud,
    saveBusinessToCloud,
    setAccessPasswordEditor,
    setBusiness,
    updateAccessAccount,
    updateBusinessSlug,
  } = model;

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

          {canManageBilling ? (
            <>
              <div className="planHeader">
                <div>
                  <span>Plano atual</span>
                  <strong>{currentPlan.name}</strong>
                </div>
                <b>{currentPlan.price}</b>
              </div>

              <div className="planGrid">
                {planOptions.map((plan) => (
                  <button type="button"
                    key={plan.id}
                    className={business.plan === plan.id ? "planCard activePlan" : "planCard"}
                    onClick={() => setBusiness({ ...business, plan: plan.id })}
                  >
                    <span>{plan.name}</span>
                    <strong>{plan.price}</strong>
                    <small>{plan.description}</small>
                  </button>
                ))}
              </div>

              <label>Status da mensalidade</label>
              <select
                value={business.monthlyStatus || "active"}
                onChange={(event) => setBusiness({ ...business, monthlyStatus: event.target.value })}
              >
                <option value="active">Ativa</option>
                <option value="trial">Teste grátis</option>
                <option value="pending">Pagamento pendente</option>
                <option value="blocked">Bloqueada</option>
              </select>

              <label>Próxima cobrança</label>
              <input
                type="date"
                value={business.nextBillingDate || ""}
                onChange={(event) => setBusiness({ ...business, nextBillingDate: event.target.value })}
              />

              <p className="adminNote">
                Esta área administrativa aparece apenas para o dono da conta.
              </p>

              <button type="button" className="green" onClick={saveBusinessToCloud}>
                {cloudSaving === "business" ? "Salvando conta..." : "Salvar conta"}
              </button>
            </>
          ) : (
            <div className="planHeader renewalOnly">
              <div>
                <span>Renovação do acesso</span>
                <strong>{formatDateOnly(business.nextBillingDate)}</strong>
              </div>
            </div>
          )}
        </section>


    </>
  );
}
