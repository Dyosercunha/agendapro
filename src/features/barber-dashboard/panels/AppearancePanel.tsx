import React, { useState } from "react";
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

function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

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
    throw new Error("O CEP não trouxe rua válida. Cadastre o endereço manualmente.");
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

  async function fillAddressByCep() {
    setAddressLoading(true);
    setAddressMessage("");

    try {
      const address = await fetchCepAddress(
        addressLookup.cep,
        addressLookup.number,
        addressLookup.complement
      );
      setBusiness({
        ...business,
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
    setBusiness({
      ...business,
      address: value,
      mapsUrl: hasSpecificMapsUrl(business.mapsUrl) ? business.mapsUrl : buildMapsUrl(value),
    });
  }

  function regenerateMapsLink() {
    const url = buildMapsUrl(business.address);
    setBusiness({ ...business, mapsUrl: url });
    setAddressMessage(url ? "Link de rota gerado pelo endereço atual." : "Informe o endereço antes de gerar a rota.");
  }

  return (
    <>
        <section className={activeAdminTab === "appearance" ? "card" : "hiddenPanel"}>
          <h2>Aparência</h2>

          <label>Nome do estabelecimento</label>
          <input value={business.name} onChange={(event) => updateBusinessName(event.target.value)} />

          <label>Logo/letra</label>
          <input value={business.logo} onChange={(event) => setBusiness({ ...business, logo: event.target.value.slice(0, 2) })} />

          <label>Subir logo em imagem</label>
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {cloudSaving === "asset-logo" && (
            <p className="hint">Enviando logo para o Supabase Storage...</p>
          )}
          {business.logoImage && (
            <button type="button"
              className="dangerButton"
              onClick={() => setBusiness({ ...business, logoImage: "" })}
            >
              Remover logo enviada
            </button>
          )}

          <div className="brandPreview">
            <div className={business.logoImage ? "logo logoWithImage" : "logo"}>
              {business.logoImage ? <img src={business.logoImage} alt="Logo" /> : business.logo}
            </div>
            <div>
              <span>Prévia da marca</span>
              <strong>{business.name}</strong>
            </div>
          </div>

          <div className="colorGrid">
            <div>
              <label>Cor principal</label>
              <input
                className="colorInput"
                type="color"
                value={business.themeColor}
                onChange={(event) => setBusiness({ ...business, themeColor: event.target.value })}
              />
            </div>
            <div>
              <label>Cor de apoio</label>
              <input
                className="colorInput"
                type="color"
                value={business.themeColorSecondary}
                onChange={(event) =>
                  setBusiness({ ...business, themeColorSecondary: event.target.value })
                }
              />
            </div>
          </div>

          <div className="adminItem">
            <h3>Plano de fundo</h3>
            <label>Imagem de fundo do cliente</label>
            <input
              value={business.clientBackgroundUrl || ""}
              onChange={(event) =>
                setBusiness({ ...business, clientBackgroundUrl: event.target.value })
              }
              placeholder="https://site.com/fundo-cliente.jpg"
            />
            <label>Subir imagem de fundo do cliente</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleBackgroundUpload("clientBackgroundUrl", event)}
            />
            {cloudSaving === "asset-client-background" && (
              <p className="hint">Enviando fundo do cliente para o Supabase Storage...</p>
            )}
            <label>Opacidade do fundo do cliente</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={business.clientBackgroundOpacity}
              onChange={(event) =>
                setBusiness({ ...business, clientBackgroundOpacity: Number(event.target.value) })
              }
            />
            <button type="button"
              className="outline"
              onClick={() => setBusiness({ ...business, clientBackgroundUrl: "" })}
            >
              Excluir fundo do cliente
            </button>

            <label>Imagem de fundo do painel</label>
            <input
              value={business.adminBackgroundUrl || ""}
              onChange={(event) =>
                setBusiness({ ...business, adminBackgroundUrl: event.target.value })
              }
              placeholder="https://site.com/fundo-painel.jpg"
            />
            <label>Subir imagem de fundo do painel</label>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleBackgroundUpload("adminBackgroundUrl", event)}
            />
            {cloudSaving === "asset-admin-background" && (
              <p className="hint">Enviando fundo do painel para o Supabase Storage...</p>
            )}
            <label>Opacidade do fundo do painel</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={business.adminBackgroundOpacity}
              onChange={(event) =>
                setBusiness({ ...business, adminBackgroundOpacity: Number(event.target.value) })
              }
            />
            <button type="button"
              className="outline"
              onClick={() => setBusiness({ ...business, adminBackgroundUrl: "" })}
            >
              Excluir fundo do painel
            </button>

          <button type="button" className="black" onClick={saveBackgroundsToCloud}>
            {cloudSaving === "backgrounds" ? "Salvando fundos..." : "Salvar planos de fundo"}
          </button>
        </div>

          <div className="adminItem portfolioEditor">
            <div className="sectionTitle">
              <h3>Carrossel da tela do cliente</h3>
              <span>{appearanceMediaAvailable ? "Fotos liberadas" : "Bloqueado em Melhorias"}</span>
            </div>

            <p className="hint">
              As fotos só aparecem para o cliente depois que a melhoria estiver liberada e pelo
              menos uma imagem real for cadastrada.
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
                          value={imageUrl}
                          onChange={(event) =>
                            setBusiness({ ...business, [field]: event.target.value })
                          }
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
                          onChange={(event) =>
                            setBusiness({ ...business, [labelField]: event.target.value })
                          }
                        />
                        {imageUrl ? (
                          <div
                            className="portfolioEditorPreview"
                            style={{ backgroundImage: `url(${imageUrl})` }}
                          >
                            <button
                              type="button"
                              onClick={() => setBusiness({ ...business, [field]: "" })}
                            >
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

                <button type="button" className="black" onClick={saveAppearanceMediaToCloud}>
                  {cloudSaving === "appearance-media"
                    ? "Salvando fotos..."
                    : "Salvar fotos do carrossel"}
                </button>
              </>
            ) : (
              <p className="hint">
                Libere a melhoria Fotos Antes / Processo / Finalizado na aba Melhorias para
                ativar o upload e o carrossel da tela do cliente.
              </p>
            )}
          </div>

          <label>WhatsApp</label>
          <input value={business.whatsapp} onChange={(event) => setBusiness({ ...business, whatsapp: event.target.value })} />

          <div className="adminItem locationEditor">
            <div className="sectionTitle">
              <h3>Endereço e rota</h3>
              <span>Cliente abre no Maps</span>
            </div>

            <div className="timePair">
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
              value={business.address}
              onChange={(event) => updateAddressManually(event.target.value)}
              placeholder="Rua, número - bairro - cidade"
            />

            <label>Link de rota no Google Maps</label>
            <input
              value={business.mapsUrl || currentMapsUrl}
              onChange={(event) => setBusiness({ ...business, mapsUrl: event.target.value })}
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
          </div>

          <label>Título da tela final</label>
          <input value={business.successTitle} onChange={(event) => setBusiness({ ...business, successTitle: event.target.value })} />

          <label>Mensagem principal</label>
          <input value={business.successMessage} onChange={(event) => setBusiness({ ...business, successMessage: event.target.value })} />

          <label>Mensagem final</label>
          <input value={business.successFooter} onChange={(event) => setBusiness({ ...business, successFooter: event.target.value })} />

          <button type="button" className="green" onClick={saveBusinessToCloud}>
            {cloudSaving === "business" ? "Salvando aparência..." : "Salvar aparência"}
          </button>
        </section>


    </>
  );
}
