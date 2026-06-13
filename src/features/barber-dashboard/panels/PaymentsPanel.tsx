import React from "react";
import type {
  Barbershop,
  FeatureFlag,
  FeatureFlags,
  FeatureKey,
  Promotion,
  PromotionType,
} from "../../../types/app";

export type PaymentsPanelModel = {
  activeAdminTab: string;
  business: Barbershop;
  clampPercentage: (value: unknown) => number;
  cloudSaving: string;
  featureFlags: FeatureFlags;
  pixAvailable: boolean;
  promotionAvailable: boolean;
  saveBusinessToCloud: () => void;
  setBusiness: (business: Barbershop) => void;
  updateFeatureFlag: (
    feature: FeatureKey | string,
    field: keyof FeatureFlag,
    value: boolean
  ) => void;
};

type PaymentsPanelProps = {
  model: PaymentsPanelModel;
};

export default function PaymentsPanel({ model }: PaymentsPanelProps) {
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

  const promotions: Promotion[] = Array.isArray(business.promotions) ? business.promotions : [];
  const pixReleased = Boolean(featureFlags.pix?.released);
  const promotionsReleased = Boolean(featureFlags.promotions?.released);
  const activePromotions = promotions.filter((promotion) => promotion.active).length;

  function updatePromotion(
    index: number,
    key: keyof Promotion,
    value: Promotion[keyof Promotion]
  ) {
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

  function removePromotion(index: number) {
    setBusiness({
      ...business,
      promotions: promotions.filter((_, itemIndex) => itemIndex !== index),
    });
  }

  function togglePix() {
    if (!pixReleased) return;

    setBusiness({ ...business, pixEnabled: !business.pixEnabled });
    updateFeatureFlag("pix", "enabled", !featureFlags.pix?.enabled);
  }

  return (
    <section className={activeAdminTab === "payments" ? "card paymentsPanelCard" : "hiddenPanel"}>
      <div className="panelHero paymentsPanelHero">
        <div>
          <span>Pagamentos</span>
          <h2>PIX e promoções</h2>
          <p>
            Configure pagamento antecipado, desconto no checkout e campanhas comerciais da
            barbearia.
          </p>
        </div>

        <div className="panelHeroMetric paymentsHeroMetric">
          <span>{pixAvailable ? "PIX ativo" : "PIX inativo"}</span>
          <strong>{promotions.length}</strong>
          <small>
            {promotions.length === 1 ? "promoção cadastrada" : "promoções cadastradas"}
          </small>
        </div>
      </div>

      <div className="paymentsWorkspaceGrid">
        <section className="paymentsSectionBlock paymentsPixBlock">
          <div className="paymentsSectionHeader">
            <div>
              <span>Checkout</span>
              <h3>PIX antecipado</h3>
            </div>
            <strong>{pixReleased ? "Disponível no plano" : "Bloqueado em Melhorias"}</strong>
          </div>

          <p className="paymentsSectionText">
            Quando ativo, o cliente vê a opção de pagar por PIX na etapa final do agendamento. O
            desconto é aplicado automaticamente no resumo.
          </p>

          <button
            type="button"
            className={pixAvailable ? "pixToggleButton active" : "pixToggleButton"}
            disabled={!pixReleased}
            onClick={togglePix}
          >
            <span>{pixAvailable ? "Ativo no checkout" : "Desativado no checkout"}</span>
            <strong>{pixAvailable ? "PIX antecipado ativo" : "Ativar PIX antecipado"}</strong>
          </button>

          <div className="paymentsFieldGrid">
            <div className="paymentsInputCard">
              <label>Chave PIX</label>
              <input
                value={business.pixKey || ""}
                onChange={(event) => setBusiness({ ...business, pixKey: event.target.value })}
                placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
              />
              <small>Aparece para o cliente copiar depois de escolher PIX.</small>
            </div>

            <div className="paymentsInputCard">
              <label>Desconto antecipado (%)</label>
              <input
                type="number"
                min="0"
                max="80"
                value={business.pixDiscount || 0}
                onChange={(event) =>
                  setBusiness({ ...business, pixDiscount: clampPercentage(event.target.value) })
                }
              />
              <small>Use 0 se não quiser desconto, mantendo o PIX ativo.</small>
            </div>
          </div>
        </section>

        <section className="paymentsSectionBlock paymentsSummaryBlock">
          <div className="paymentsSectionHeader">
            <div>
              <span>Resumo</span>
              <h3>Disponibilidade</h3>
            </div>
            <strong>Planos e melhorias</strong>
          </div>

          <div className="paymentsStatusGrid">
            <div>
              <span>PIX</span>
              <strong>{pixAvailable ? "Ativo" : pixReleased ? "Liberado" : "Bloqueado"}</strong>
            </div>
            <div>
              <span>Promoções</span>
              <strong>
                {promotionAvailable ? "Ativas" : promotionsReleased ? "Liberadas" : "Bloqueadas"}
              </strong>
            </div>
            <div>
              <span>Campanhas ativas</span>
              <strong>{activePromotions}</strong>
            </div>
          </div>

          <p className="paymentsSectionText">
            Promoções são recurso do plano Profissional. Lista de espera, fidelidade e comissões
            continuam controladas na aba Melhorias conforme o plano contratado.
          </p>
        </section>
      </div>

      <section className="paymentsSectionBlock paymentsPromotionsBlock">
        <div className="paymentsSectionHeader">
          <div>
            <span>Plano Profissional</span>
            <h3>Promoções inteligentes</h3>
          </div>
          <strong>{promotionAvailable ? "Ativa" : "Inativa"}</strong>
        </div>

        <p className="paymentsSectionText">
          Cadastre uma ou mais promoções para aparecerem na tela do cliente. A barbearia pode usar
          desconto ou preço final promocional.
        </p>

        {promotions.length === 0 && (
          <div className="emptyPromotionState">
            <strong>Nenhuma promoção cadastrada</strong>
            <span>Adicione uma campanha para começar a vender combos e horários especiais.</span>
          </div>
        )}

        <div className="promotionEditorGrid">
          {promotions.map((promotion, index) => {
            const promotionType: PromotionType = promotion.type === "price" ? "price" : "discount";

            return (
              <article
                className={promotion.active ? "promotionEditor activePromotionEditor" : "promotionEditor"}
                key={promotion.id || index}
              >
                <div className="promotionEditorHeader">
                  <div>
                    <span>Promoção {index + 1}</span>
                    <h3>{promotion.title || "Promoção sem nome"}</h3>
                  </div>
                  <button
                    type="button"
                    className={promotion.active ? "statusPill activeStatus" : "statusPill"}
                    disabled={!promotionsReleased}
                    onClick={() => updatePromotion(index, "active", !promotion.active)}
                  >
                    {promotion.active ? "Ativa" : "Inativa"}
                  </button>
                </div>

                <div className="promotionFormGrid">
                  <div>
                    <label>Nome da promoção</label>
                    <input
                      disabled={!promotionsReleased}
                      value={promotion.title || ""}
                      onChange={(event) => updatePromotion(index, "title", event.target.value)}
                    />
                  </div>

                  <div>
                    <label>Tipo da promoção</label>
                    <select
                      disabled={!promotionsReleased}
                      value={promotionType}
                      onChange={(event) =>
                        updatePromotion(index, "type", event.target.value as PromotionType)
                      }
                    >
                      <option value="discount">Desconto</option>
                      <option value="price">Valor promocional</option>
                    </select>
                  </div>

                  <div className="promotionWideField">
                    <label>Descrição da promoção</label>
                    <input
                      disabled={!promotionsReleased}
                      value={promotion.description || ""}
                      onChange={(event) => updatePromotion(index, "description", event.target.value)}
                    />
                  </div>
                </div>

                {promotionType === "price" ? (
                  <div className="paymentsInputCard promotionValueCard">
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
                    <small>Use quando a campanha tiver preço final, como “Corte por R$ 50”.</small>
                  </div>
                ) : (
                  <div className="promotionDiscountGrid">
                    <div className="paymentsInputCard">
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
                    <div className="paymentsInputCard">
                      <label>Desconto em R$</label>
                      <input
                        disabled={!promotionsReleased}
                        type="number"
                        min="0"
                        step="1"
                        value={promotion.discountValue || 0}
                        onChange={(event) =>
                          updatePromotion(
                            index,
                            "discountValue",
                            Math.max(Number(event.target.value) || 0, 0)
                          )
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
              </article>
            );
          })}
        </div>

        <div className="paymentsActionRow">
          <button type="button" className="black" disabled={!promotionsReleased} onClick={addPromotion}>
            Adicionar promoção
          </button>
          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando pagamentos..." : "Salvar pagamentos"}
          </button>
        </div>
      </section>
    </section>
  );
}
