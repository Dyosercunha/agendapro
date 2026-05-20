// @ts-nocheck
import React from "react";

export default function PaymentsPanel({ model }) {
  const {
    activeAdminTab,
    business,
    clampPercentage,
    cloudSaving,
    featureFlags,
    pixAvailable,
    promotionAvailable,
    saveBusinessToCloud,
    setBusiness,
    updateFeatureFlag,
  } = model;

  return (
    <>
        <section className={activeAdminTab === "payments" ? "card" : "hiddenPanel"}>
          <h2>Pagamentos</h2>
          <button type="button"
            className={pixAvailable ? "selected" : ""}
            disabled={!featureFlags.pix?.released}
            onClick={() => {
              setBusiness({ ...business, pixEnabled: !business.pixEnabled });
              updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
            }}
          >
            {pixAvailable ? "PIX antecipado ativo" : "PIX antecipado desativado"}
          </button>

          <label>Chave PIX</label>
          <input value={business.pixKey} onChange={(event) => setBusiness({ ...business, pixKey: event.target.value })} />

          <label>Desconto antecipado (%)</label>
          <input
            type="number"
            min="0"
            max="80"
            value={business.pixDiscount}
            onChange={(event) =>
              setBusiness({ ...business, pixDiscount: clampPercentage(event.target.value) })
            }
          />

          <h2>Opcionais</h2>
          <p className="hint">
            Promoções, lista de espera e fidelidade ficam bloqueados até serem liberados
            na aba Melhorias.
          </p>

          <div className={featureFlags.promotions?.released ? "promoConfig" : "promoConfig lockedPromo"}>
            <div className="sectionTitle">
              <h2>Promoções inteligentes</h2>
              <span>{promotionAvailable ? "Ativa" : "Inativa"}</span>
            </div>
            <p className="hint">
              Libere em Melhorias, configure o desconto aqui e salve as alterações.
            </p>

            <label>Nome da promoção</label>
            <input
              disabled={!featureFlags.promotions?.released}
              value={business.promotionTitle || ""}
              onChange={(event) => setBusiness({ ...business, promotionTitle: event.target.value })}
            />

            <label>Descrição da promoção</label>
            <input
              disabled={!featureFlags.promotions?.released}
              value={business.promotionDescription || ""}
              onChange={(event) =>
                setBusiness({ ...business, promotionDescription: event.target.value })
              }
            />

            <label>Desconto da promoção (%)</label>
            <input
              disabled={!featureFlags.promotions?.released}
              type="number"
              min="0"
              max="80"
              value={business.promotionDiscount || 0}
              onChange={(event) =>
                setBusiness({ ...business, promotionDiscount: clampPercentage(event.target.value) })
              }
            />
          </div>

          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando pagamentos..." : "Salvar pagamentos"}
          </button>
        </section>


    </>
  );
}
