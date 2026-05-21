// @ts-nocheck
import React from "react";

export default function AppearancePanel({ model }) {
  const {
    activeAdminTab,
    business,
    cloudSaving,
    handleBackgroundUpload,
    handleLogoUpload,
    saveBackgroundsToCloud,
    saveBusinessToCloud,
    setBusiness,
    updateBusinessName,
  } = model;

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

          <label>WhatsApp</label>
          <input value={business.whatsapp} onChange={(event) => setBusiness({ ...business, whatsapp: event.target.value })} />

          <label>Endereço da barbearia</label>
          <input
            value={business.address}
            onChange={(event) => setBusiness({ ...business, address: event.target.value })}
          />

          <label>Link do Google Maps</label>
          <input
            value={business.mapsUrl}
            onChange={(event) => setBusiness({ ...business, mapsUrl: event.target.value })}
          />

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
