import React, { useState } from "react";
import { onlyDigits } from "../../../lib/phone";
import { buildBookingPath } from "../../../lib/routes";
import type { Barbershop } from "../../../types/app";

export type BackgroundField = "adminBackgroundUrl" | "clientBackgroundUrl";
export type PortfolioImageField = "beforeImageUrl" | "processImageUrl" | "finalImageUrl";

type AddressLookup = {
  cep: string;
  complement: string;
  number: string;
};

type CepAddressResponse = {
  bairro?: string;
  erro?: boolean;
  localidade?: string;
  logradouro?: string;
  uf?: string;
};

export type AppearancePanelModel = {
  activeAdminTab: string;
  appearanceMediaAvailable: boolean;
  backplateAvailable: boolean;
  business: Barbershop;
  cloudSaving: string;
  handleBackgroundUpload: (
    field: BackgroundField,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>;
  handleLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  handlePortfolioImageUpload: (
    field: PortfolioImageField,
    event: React.ChangeEvent<HTMLInputElement>
  ) => void | Promise<void>;
  saveAppearanceMediaToCloud: () => void;
  saveBackgroundsToCloud: () => void;
  saveBusinessToCloud: () => void;
  setBusiness: React.Dispatch<React.SetStateAction<Barbershop>>;
  updateBusinessName: (value: string) => void;
};

type AppearancePanelProps = {
  model: AppearancePanelModel;
};

function buildMapsUrl(address = "") {
  const cleanAddress = String(address || "").trim();
  if (!cleanAddress) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanAddress)}`;
}

function hasSpecificMapsUrl(value = "") {
  const url = String(value || "").trim();
  if (!url) return false;
  return !/^https?:\/\/(www\.)?(maps\.google\.com|google\.com\/maps)\/?$/i.test(url);
}

function isInlineImageData(value = "") {
  return String(value || "").trim().startsWith("data:image/");
}

function compactImageValue(value = "") {
  if (isInlineImageData(value)) {
    return "Imagem carregada localmente (base64). Use os botões de upload/remover.";
  }

  return value;
}

function buildCepAddress(cepData: CepAddressResponse, number: string, complement: string) {
  const street = cepData?.logradouro || "";
  const neighborhood = cepData?.bairro || "";
  const city = cepData?.localidade || "";
  const state = cepData?.uf || "";
  const cleanNumber = String(number || "").trim();
  const cleanComplement = String(complement || "").trim();

  if (!street || !cleanNumber) return "";

  return [
    `${street}, ${cleanNumber}${cleanComplement ? ` - ${cleanComplement}` : ""}`,
    neighborhood,
    city && state ? `${city} - ${state}` : city || state,
  ]
    .filter(Boolean)
    .join(" - ");
}

async function fetchCepAddress(cep: string, number: string, complement: string) {
  const cleanCep = onlyDigits(cep);
  const cleanNumber = String(number || "").trim();

  if (cleanCep.length !== 8) {
    throw new Error("Informe um CEP válido com 8 números.");
  }

  if (!cleanNumber) {
    throw new Error("Informe o número do estabelecimento antes de puxar o endereço.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  const data = (await response.json().catch(() => null)) as CepAddressResponse | null;

  if (!response.ok || !data || data.erro) {
    throw new Error("CEP não encontrado. Confira o número ou cadastre o endereço manualmente.");
  }

  const address = buildCepAddress(data, cleanNumber, complement);
  if (!address) {
    throw new Error("O CEP não trouxe uma rua válida. Cadastre o endereço manualmente.");
  }

  return address;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AppearancePanel({ model }: AppearancePanelProps) {
  const {
    activeAdminTab,
    appearanceMediaAvailable,
    backplateAvailable,
    business,
    cloudSaving,
    handleBackgroundUpload,
    handleLogoUpload,
    handlePortfolioImageUpload,
    saveAppearanceMediaToCloud,
    saveBackgroundsToCloud,
    saveBusinessToCloud,
    setBusiness,
    updateBusinessName,
  } = model;
  const [addressLookup, setAddressLookup] = useState<AddressLookup>({
    cep: "",
    complement: "",
    number: "",
  });
  const [addressMessage, setAddressMessage] = useState("");
  const [addressLoading, setAddressLoading] = useState(false);

  const currentMapsUrl = hasSpecificMapsUrl(business.mapsUrl)
    ? business.mapsUrl
    : buildMapsUrl(business.address);
  const clientPreviewUrl = business.slug ? buildBookingPath(business.slug) : "/";
  const themeMode = business.themeMode === "light" ? "light" : "dark";
  const themeColor = business.themeColor || "#22c55e";
  const themeColorSecondary = business.themeColorSecondary || "#4ade80";
  const ratingValue = Number(business.ratingValue || 5).toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const welcomeMessage =
    business.welcomeMessage ||
    "Escolha seu atendimento, veja horários disponíveis e agende pelo celular.";
  const previewBackgroundStyle = business.clientBackgroundUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(7,10,13,0.08), rgba(7,10,13,0.9)), url(${business.clientBackgroundUrl})`,
      }
    : undefined;
  const previewButtonStyle = {
    background: `linear-gradient(135deg, ${themeColor}, ${themeColorSecondary})`,
  };
  const portfolioFields: Array<{
    field: PortfolioImageField;
    labelField: "beforeImageLabel" | "processImageLabel" | "finalImageLabel";
    title: string;
    uploadingKey: string;
  }> = [
    {
      field: "beforeImageUrl",
      labelField: "beforeImageLabel",
      title: "Antes",
      uploadingKey: "asset-portfolio-before",
    },
    {
      field: "processImageUrl",
      labelField: "processImageLabel",
      title: "Processo",
      uploadingKey: "asset-portfolio-process",
    },
    {
      field: "finalImageUrl",
      labelField: "finalImageLabel",
      title: "Finalizado",
      uploadingKey: "asset-portfolio-final",
    },
  ];
  const previewImages = portfolioFields
    .map(({ field, labelField, title }) => ({
      label: business[labelField] || title,
      url: business[field] || "",
    }))
    .filter((item) => item.url);

  function updateBusiness(update: Partial<Barbershop>) {
    setBusiness({ ...business, ...update });
  }

  async function fillAddressByCep() {
    setAddressLoading(true);
    setAddressMessage("");

    try {
      const address = await fetchCepAddress(
        addressLookup.cep,
        addressLookup.number,
        addressLookup.complement
      );
      updateBusiness({
        address,
        mapsUrl: buildMapsUrl(address),
      });
      setAddressMessage("Endereço encontrado pelo CEP. Confira e salve a aparência.");
    } catch (error) {
      setAddressMessage(errorMessage(error, "Não foi possível buscar o endereço pelo CEP."));
    } finally {
      setAddressLoading(false);
    }
  }

  function updateAddressManually(value: string) {
    updateBusiness({
      address: value,
      mapsUrl: hasSpecificMapsUrl(business.mapsUrl) ? business.mapsUrl : buildMapsUrl(value),
    });
  }

  function regenerateMapsLink() {
    const url = buildMapsUrl(business.address);
    updateBusiness({ mapsUrl: url });
    setAddressMessage(url ? "Link de rota gerado pelo endereço atual." : "Informe o endereço antes de gerar a rota.");
  }

  return (
    <section className={activeAdminTab === "appearance" ? "card appearancePanelCard" : "hiddenPanel"}>
      <div className="panelHero appearancePanelHero">
        <div>
          <span>Aparência</span>
          <h2>Identidade premium</h2>
          <p>
            Personalize marca, capa, cores, rota, WhatsApp e textos da experiência do cliente.
          </p>
        </div>
        <a className="heroActionButton" href={clientPreviewUrl} target="_blank" rel="noreferrer">
          Ver como cliente
        </a>
      </div>

      <div className="appearanceWorkspaceGrid">
        <div className="appearanceEditorStack">
          <section className="appearanceSectionBlock appearanceIdentityBlock">
            <div className="appearanceSectionHeader">
              <div>
                <span>Marca</span>
                <h3>Identidade da barbearia</h3>
              </div>
              <strong>Logo, cores e texto</strong>
            </div>

            <div className="brandPreview">
              <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
                {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
              </div>
              <div>
                <span>Prévia da marca</span>
                <strong>{business.name}</strong>
              </div>
            </div>

            <div className="appearanceFieldGrid twoColumns">
              <div>
                <label>Nome do estabelecimento</label>
                <input
                  value={business.name}
                  onChange={(event) => updateBusinessName(event.target.value)}
                />
              </div>
              <div>
                <label>Logo em texto</label>
                <input
                  value={business.logo || ""}
                  onChange={(event) => updateBusiness({ logo: event.target.value.slice(0, 2) })}
                  placeholder="AP"
                />
              </div>
            </div>

            <div className="appearanceUploadRow">
              <div>
                <label>Subir logo em imagem</label>
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
                {cloudSaving === "asset-logo" && (
                  <p className="hint">Enviando logo para a nuvem...</p>
                )}
              </div>
              {business.logoImage && (
                <button
                  type="button"
                  className="dangerButton"
                  onClick={() => updateBusiness({ logoImage: "" })}
                >
                  Remover logo
                </button>
              )}
            </div>

            <div className="appearanceFieldGrid twoColumns">
              <div>
                <label>Cor principal</label>
                <input
                  className="colorInput"
                  type="color"
                  value={themeColor}
                  onChange={(event) => updateBusiness({ themeColor: event.target.value })}
                />
              </div>
              <div>
                <label>Cor secundária</label>
                <input
                  className="colorInput"
                  type="color"
                  value={themeColorSecondary}
                  onChange={(event) => updateBusiness({ themeColorSecondary: event.target.value })}
                />
              </div>
            </div>

            <div className="appearanceFieldGrid twoColumns">
              <div>
                <label>Nota exibida</label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={business.ratingValue || 5}
                  onChange={(event) => updateBusiness({ ratingValue: Number(event.target.value) })}
                />
              </div>
              <div>
                <label>Tema da tela do cliente</label>
                <div className="appearanceModeSwitch">
                  <button
                    type="button"
                    className={themeMode === "dark" ? "selected" : ""}
                    onClick={() => updateBusiness({ themeMode: "dark" })}
                  >
                    Escuro
                  </button>
                  <button
                    type="button"
                    className={themeMode === "light" ? "selected" : ""}
                    onClick={() => updateBusiness({ themeMode: "light" })}
                  >
                    Claro
                  </button>
                </div>
                <small className="fieldHint">
                  Aplica na página pública de agendamento e na prévia ao vivo.
                </small>
              </div>
            </div>

            <label>Texto de boas-vindas</label>
            <textarea
              value={welcomeMessage}
              onChange={(event) => updateBusiness({ welcomeMessage: event.target.value })}
              placeholder="Mensagem curta para aparecer na tela do cliente"
            />

            <label>Texto da avaliação</label>
            <input
              value={business.ratingText || "Avaliação informada pela barbearia"}
              onChange={(event) => updateBusiness({ ratingText: event.target.value })}
              placeholder="Exemplo: Avaliação dos clientes"
            />
          </section>

          <section className="appearanceSectionBlock">
            <div className="appearanceSectionHeader">
              <div>
                <span>Planos de fundo</span>
                <h3>Capa do cliente e fundo do painel</h3>
              </div>
              <strong>{backplateAvailable ? "Liberado" : "Bloqueado em Melhorias"}</strong>
            </div>

            <div className="appearanceAssetGrid">
              <div className="appearanceAssetCard">
                <div>
                  <span>Cliente</span>
                  <strong>Foto de capa da tela do cliente</strong>
                </div>
                <input
                  className="assetValueInput"
                  value={compactImageValue(business.clientBackgroundUrl || "")}
                  readOnly={isInlineImageData(business.clientBackgroundUrl || "")}
                  onChange={(event) => updateBusiness({ clientBackgroundUrl: event.target.value })}
                  placeholder="https://site.com/fundo-cliente.jpg"
                />
                <label>Subir foto de capa do cliente</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleBackgroundUpload("clientBackgroundUrl", event)}
                />
                {cloudSaving === "asset-client-background" && (
                  <p className="hint">Enviando fundo do cliente para a nuvem...</p>
                )}
                <label>Opacidade da capa</label>
                <input
                  type="number"
                  min="0"
                  max="0.7"
                  step="0.05"
                  value={business.clientBackgroundOpacity ?? 0.5}
                  onChange={(event) =>
                    updateBusiness({ clientBackgroundOpacity: Number(event.target.value) })
                  }
                />
                <button
                  type="button"
                  className="outline"
                  onClick={() => updateBusiness({ clientBackgroundUrl: "" })}
                >
                  Excluir fundo do cliente
                </button>
              </div>

              <div className="appearanceAssetCard">
                <div>
                  <span>Painel</span>
                  <strong>Fundo do painel da barbearia</strong>
                </div>
                <input
                  className="assetValueInput"
                  value={compactImageValue(business.adminBackgroundUrl || "")}
                  readOnly={isInlineImageData(business.adminBackgroundUrl || "")}
                  onChange={(event) => updateBusiness({ adminBackgroundUrl: event.target.value })}
                  placeholder="https://site.com/fundo-painel.jpg"
                />
                <label>Subir fundo do painel</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleBackgroundUpload("adminBackgroundUrl", event)}
                />
                {cloudSaving === "asset-admin-background" && (
                  <p className="hint">Enviando fundo do painel para a nuvem...</p>
                )}
                <label>Opacidade do fundo</label>
                <input
                  type="number"
                  min="0"
                  max="0.7"
                  step="0.05"
                  value={business.adminBackgroundOpacity ?? 0.7}
                  onChange={(event) =>
                    updateBusiness({ adminBackgroundOpacity: Number(event.target.value) })
                  }
                />
                <button
                  type="button"
                  className="outline"
                  onClick={() => updateBusiness({ adminBackgroundUrl: "" })}
                >
                  Excluir fundo do painel
                </button>
              </div>
            </div>

            {!backplateAvailable && (
              <p className="hint">
                Libere a melhoria Plano de fundo personalizado na aba Melhorias ou no Painel
                Plataforma antes de salvar estes fundos na nuvem.
              </p>
            )}

            <button
              type="button"
              className={backplateAvailable ? "green compactSaveButton" : "outline compactSaveButton"}
              onClick={saveBackgroundsToCloud}
            >
              {cloudSaving === "backgrounds"
                ? "Salvando fundos..."
                : backplateAvailable
                ? "Salvar planos de fundo"
                : "Plano de fundo bloqueado"}
            </button>
          </section>

          <section className="appearanceSectionBlock portfolioEditor">
            <div className="appearanceSectionHeader">
              <div>
                <span>Carrossel</span>
                <h3>Fotos da tela do cliente</h3>
              </div>
              <strong>{appearanceMediaAvailable ? "Fotos liberadas" : "Bloqueado em Melhorias"}</strong>
            </div>

            <p className="hint">
              As fotos só aparecem para o cliente depois que a melhoria estiver liberada e pelo menos uma imagem real for cadastrada.
            </p>

            {appearanceMediaAvailable ? (
              <>
                <div className="portfolioEditorGrid">
                  {portfolioFields.map(({ field, labelField, title, uploadingKey }) => {
                    const imageUrl = business[field] || "";
                    const labelValue = business[labelField] || title;

                    return (
                      <div className="portfolioEditorItem" key={field}>
                        <label>Foto {title}</label>
                        <input
                          className="assetValueInput"
                          value={compactImageValue(imageUrl)}
                          readOnly={isInlineImageData(imageUrl)}
                          onChange={(event) => updateBusiness({ [field]: event.target.value })}
                          placeholder={`https://site.com/${title.toLowerCase()}.jpg`}
                        />
                        <label>Subir foto {title}</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => handlePortfolioImageUpload(field, event)}
                        />
                        {cloudSaving === uploadingKey && (
                          <p className="hint">Enviando foto {title.toLowerCase()}...</p>
                        )}
                        <label>Legenda</label>
                        <input
                          value={labelValue}
                          onChange={(event) => updateBusiness({ [labelField]: event.target.value })}
                        />
                        {imageUrl ? (
                          <div
                            className="portfolioEditorPreview"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                          >
                            <button type="button" onClick={() => updateBusiness({ [field]: "" })}>
                              Remover
                            </button>
                          </div>
                        ) : (
                          <div className="portfolioEditorEmpty">Aguardando imagem</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button type="button" className="green compactSaveButton" onClick={saveAppearanceMediaToCloud}>
                  {cloudSaving === "appearance-media" ? "Salvando fotos..." : "Salvar fotos do carrossel"}
                </button>
              </>
            ) : (
              <p className="hint">
                Libere a melhoria Fotos Antes / Processo / Finalizado na aba Melhorias para ativar o upload e o carrossel da tela do cliente.
              </p>
            )}
          </section>

          <section className="appearanceSectionBlock">
            <div className="appearanceSectionHeader">
              <div>
                <span>Contato e rota</span>
                <h3>WhatsApp, endereço e Maps</h3>
              </div>
              <strong>Cliente encontra fácil</strong>
            </div>

            <label>WhatsApp</label>
            <input
              value={business.whatsapp || ""}
              onChange={(event) => updateBusiness({ whatsapp: event.target.value })}
            />

            <div className="appearanceFieldGrid twoColumns">
              <div>
                <label>CEP</label>
                <input
                  inputMode="numeric"
                  value={addressLookup.cep}
                  onChange={(event) =>
                    setAddressLookup({
                      ...addressLookup,
                      cep: onlyDigits(event.target.value).slice(0, 8),
                    })
                  }
                  placeholder="00000000"
                />
              </div>
              <div>
                <label>Número</label>
                <input
                  value={addressLookup.number}
                  onChange={(event) =>
                    setAddressLookup({ ...addressLookup, number: event.target.value })
                  }
                  placeholder="123"
                />
              </div>
            </div>

            <label>Complemento</label>
            <input
              value={addressLookup.complement}
              onChange={(event) =>
                setAddressLookup({ ...addressLookup, complement: event.target.value })
              }
              placeholder="Sala, loja, referência..."
            />

            <button
              type="button"
              className="black"
              disabled={addressLoading}
              onClick={fillAddressByCep}
            >
              {addressLoading ? "Buscando CEP..." : "Puxar endereço pelo CEP"}
            </button>

            <label>Endereço da barbearia</label>
            <input
              value={business.address || ""}
              onChange={(event) => updateAddressManually(event.target.value)}
              placeholder="Rua, número - bairro - cidade"
            />

            <label>Link de rota no Google Maps</label>
            <input
              value={business.mapsUrl || currentMapsUrl}
              onChange={(event) => updateBusiness({ mapsUrl: event.target.value })}
              placeholder="Gerado automaticamente pelo endereço"
            />

            <div className="addressActions">
              <button type="button" className="outline" onClick={regenerateMapsLink}>
                Gerar rota pelo endereço
              </button>
              {currentMapsUrl && (
                <a href={currentMapsUrl} target="_blank" rel="noreferrer">
                  Testar rota
                </a>
              )}
            </div>

            {addressMessage && <p className="hint">{addressMessage}</p>}
          </section>

          <section className="appearanceSectionBlock">
            <div className="appearanceSectionHeader">
              <div>
                <span>Confirmação</span>
                <h3>Tela final do cliente</h3>
              </div>
              <strong>Mensagem de confiança</strong>
            </div>

            <label>Título da tela final</label>
            <input
              value={business.successTitle || ""}
              onChange={(event) => updateBusiness({ successTitle: event.target.value })}
            />

            <label>Mensagem principal</label>
            <input
              value={business.successMessage || ""}
              onChange={(event) => updateBusiness({ successMessage: event.target.value })}
            />

            <label>Mensagem final</label>
            <input
              value={business.successFooter || ""}
              onChange={(event) => updateBusiness({ successFooter: event.target.value })}
            />

            <button type="button" className="green compactSaveButton" onClick={saveBusinessToCloud}>
              {cloudSaving === "business" ? "Salvando aparência..." : "Salvar aparência"}
            </button>
          </section>
        </div>

        <aside className="appearancePreviewPanel">
          <div className="appearanceSectionHeader">
            <div>
              <span>Prévia ao vivo</span>
              <h3>Como o cliente vê</h3>
            </div>
            <strong>{themeMode === "light" ? "Claro" : "Escuro"}</strong>
          </div>

          <div className="appearanceLivePreview">
            <div className={`appearancePhoneFrame ${themeMode === "light" ? "light" : ""}`}>
              <div className="appearancePhoneCover" style={previewBackgroundStyle}>
                <div className={business.logoImage ? "logo logoWithImage appearancePhoneLogo" : "logo appearancePhoneLogo"}>
                  {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
                </div>
                <div className="appearancePhoneCopy">
                  <span>Agenda online</span>
                  <strong>{business.name}</strong>
                  <p>{welcomeMessage}</p>
                  <div className="appearancePreviewRating">
                    <span>★★★★★</span>
                    <b>{ratingValue}</b>
                  </div>
                </div>
              </div>

              {previewImages.length > 0 && (
                <div className="appearancePreviewGallery">
                  {previewImages.slice(0, 3).map((image) => (
                    <span key={image.label} style={{ backgroundImage: `url(${image.url})` }}>
                      {image.label}
                    </span>
                  ))}
                </div>
              )}

              <button type="button" style={previewButtonStyle}>
                Escolher horário
              </button>
            </div>
          </div>

          <a className="heroActionButton fullPreviewLink" href={clientPreviewUrl} target="_blank" rel="noreferrer">
            Abrir página do cliente
          </a>
        </aside>
      </div>
    </section>
  );
}
