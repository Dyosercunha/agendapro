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

  const promotions = Array.isArray(business.promotions) ? business.promotions : [];
  const promotionsReleased = Boolean(featureFlags.promotions?.released);

  function updatePromotion(index, key, value) {
    const nextPromotions = promotions.map((promotion, itemIndex) =>
      itemIndex === index ? { ...promotion, [key]: value } : promotion
    );
    setBusiness({ ...business, promotions: nextPromotions });
  }

  function addPromotion() {
    setBusiness({
      ...business,
      promotions: promotions.concat({
        id: `promo-${Date.now()}`,
        title: "Nova promoção",
        description: "Descreva a condição da promoção.",
        type: "discount",
        discountPercent: 0,
        discountValue: 0,
        promotionalPrice: 0,
        active: true,
      }),
    });
  }

  function removePromotion(index) {
    setBusiness({
      ...business,
      promotions: promotions.filter((_, itemIndex) => itemIndex !== index),
    });
  }

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

          <div className={promotionsReleased ? "promoConfig" : "promoConfig lockedPromo"}>
            <div className="sectionTitle">
              <h2>Promoções inteligentes</h2>
              <span>{promotionAvailable ? "Ativa" : "Inativa"}</span>
            </div>
            <p className="hint">
              Libere em Melhorias, cadastre uma ou mais promoções e salve as alterações.
            </p>

            {promotions.length === 0 && (
              <p className="hint">Nenhuma promoção cadastrada ainda.</p>
            )}

            {promotions.map((promotion, index) => (
              <div className="promotionEditor" key={promotion.id || index}>
                <div className="sectionTitle">
                  <h3>Promoção {index + 1}</h3>
                  <button
                    type="button"
                    className={promotion.active ? "statusPill activeStatus" : "statusPill"}
                    disabled={!promotionsReleased}
                    onClick={() => updatePromotion(index, "active", !promotion.active)}
                  >
                    {promotion.active ? "Ativa" : "Inativa"}
                  </button>
                </div>

                <label>Nome da promoção</label>
                <input
                  disabled={!promotionsReleased}
                  value={promotion.title || ""}
                  onChange={(event) => updatePromotion(index, "title", event.target.value)}
                />

                <label>Descrição da promoção</label>
                <input
                  disabled={!promotionsReleased}
                  value={promotion.description || ""}
                  onChange={(event) => updatePromotion(index, "description", event.target.value)}
                />

                <label>Tipo da promoção</label>
                <select
                  disabled={!promotionsReleased}
                  value={promotion.type === "price" ? "price" : "discount"}
                  onChange={(event) => updatePromotion(index, "type", event.target.value)}
                >
                  <option value="discount">Desconto</option>
                  <option value="price">Valor promocional</option>
                </select>

                {promotion.type === "price" ? (
                  <div>
                    <label>Valor da promoção (R$)</label>
                    <input
                      disabled={!promotionsReleased}
                      type="number"
                      min="0"
                      step="1"
                      value={promotion.promotionalPrice || 0}
                      onChange={(event) =>
                        updatePromotion(
                          index,
                          "promotionalPrice",
                          Math.max(Number(event.target.value) || 0, 0)
                        )
                      }
                    />
                    <p className="hint">
                      Use quando a promoção tiver preço final. Exemplo: Corte por R$150.
                    </p>
                  </div>
                ) : (
                  <div className="timePair">
                    <div>
                      <label>Desconto (%)</label>
                      <input
                        disabled={!promotionsReleased}
                        type="number"
                        min="0"
                        max="80"
                        value={promotion.discountPercent || 0}
                        onChange={(event) =>
                          updatePromotion(index, "discountPercent", clampPercentage(event.target.value))
                        }
                      />
                    </div>
                    <div>
                      <label>Desconto em R$</label>
                      <input
                        disabled={!promotionsReleased}
                        type="number"
                        min="0"
                        step="1"
                        value={promotion.discountValue || 0}
                        onChange={(event) =>
                          updatePromotion(index, "discountValue", Math.max(Number(event.target.value) || 0, 0))
                        }
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="dangerButton"
                  disabled={!promotionsReleased}
                  onClick={() => removePromotion(index)}
                >
                  Excluir promoção
                </button>
              </div>
            ))}

            <button
              type="button"
              className="black"
              disabled={!promotionsReleased}
              onClick={addPromotion}
            >
              Adicionar promoção
            </button>
          </div>

          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando pagamentos..." : "Salvar pagamentos"}
          </button>
        </section>


    </>
  );
}
