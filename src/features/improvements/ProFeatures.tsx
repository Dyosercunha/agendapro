import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import type { LoyaltyClient, WaitlistEntry } from "../../types/app";

declare global {
  interface Window {
    __agendaProAdminLoggedIn?: boolean;
    __agendaProAdminTab?: string;
    __agendaProViewMode?: string;
  }
}

type ProContext = {
  admin: boolean;
  tab: string;
};

type ProBackgroundSettings = {
  admin_background_opacity: number | string;
  admin_background_url: string;
  client_background_opacity: number | string;
  client_background_url: string;
};

type ProMediaSettings = {
  before_image_label: string;
  before_image_url: string;
  final_image_label: string;
  final_image_url: string;
  logo_url: string;
  process_image_label: string;
  process_image_url: string;
};

type ProGrowthSettings = {
  google_client_login_enabled: boolean;
  instagram_url: string;
  loyalty_discount: number | string;
  loyalty_enabled: boolean;
  loyalty_reward_description: string;
  loyalty_visit_goal: number | string;
  pro_appearance_media_enabled: boolean;
  pro_backplate_enabled: boolean;
  pro_google_client_enabled: boolean;
  pro_instagram_enabled: boolean;
  pro_loyalty_enabled: boolean;
  pro_promotions_enabled: boolean;
  pro_service_delete_enabled: boolean;
  pro_waitlist_enabled: boolean;
  promotion_active: boolean;
  promotion_description: string;
  promotion_discount: number | string;
  promotion_end_date: string;
  promotion_start_date: string;
  promotion_title: string;
  theme_color: string;
};

type ProShopSettings = Partial<ProBackgroundSettings & ProMediaSettings & ProGrowthSettings>;

type ImageItem = {
  label: string;
  url: string;
};

type ProWaitlistEntry = WaitlistEntry;
type ProClient = LoyaltyClient;

type AsyncSetter<T> = React.Dispatch<React.SetStateAction<T>>;

type ClientFeatureBannerProps = {
  growth: ProGrowthSettings;
  images: ImageItem[];
};

type AppearancePanelProps = {
  background: ProBackgroundSettings;
  growth: ProGrowthSettings;
  images: ImageItem[];
  media: ProMediaSettings;
  message: string;
  reload: () => Promise<void>;
  saving: string;
  setBackground: AsyncSetter<ProBackgroundSettings>;
  setGrowth: AsyncSetter<ProGrowthSettings>;
  setMedia: AsyncSetter<ProMediaSettings>;
  setMessage: AsyncSetter<string>;
  setSaving: AsyncSetter<string>;
  slug: string;
};

type ModuleItem = {
  desc: string;
  depends: string;
  key: keyof ProGrowthSettings;
  tab: "appearance" | "improvements" | "services";
  title: string;
};

type ModuleGroup = {
  group: string;
  items: ModuleItem[];
};

type ImprovementsPanelProps = {
  clients: ProClient[];
  growth: ProGrowthSettings;
  message: string;
  reload: () => Promise<void>;
  saving: string;
  setGrowth: AsyncSetter<ProGrowthSettings>;
  setMessage: AsyncSetter<string>;
  setSaving: AsyncSetter<string>;
  waitlist: ProWaitlistEntry[];
};

type PhotoFieldConfig = {
  labelKey: keyof Pick<
    ProMediaSettings,
    "before_image_label" | "final_image_label" | "process_image_label"
  >;
  title: string;
  urlKey: keyof Pick<ProMediaSettings, "before_image_url" | "final_image_url" | "process_image_url">;
};

function makeSlug(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slugFromPathname(pathname = "") {
  const parts = String(pathname)
    .split("/")
    .map((part) => {
      try {
        return decodeURIComponent(part);
      } catch {
        return part;
      }
    })
    .filter(Boolean);

  const route = String(parts[0] || "").toLowerCase();
  const routePrefixes = ["painel", "agendamento", "barbearia"];
  const reservedRoutes = [...routePrefixes, "plataforma", "painel-plataforma", "api", "assets"];

  if (routePrefixes.includes(route)) return makeSlug(parts[1] || "");
  if (!route || reservedRoutes.includes(route)) return "";

  return makeSlug(parts[0] || "");
}

function proSlug() {
  return typeof window === "undefined" ? "" : slugFromPathname(window.location.pathname);
}

function proClient() {
  if (typeof window === "undefined") return false;

  const parts = window.location.pathname.split("/").filter(Boolean);
  const first = String(parts[0] || "").toLowerCase();

  return Boolean(slugFromPathname(window.location.pathname)) &&
    !["painel", "plataforma", "painel-plataforma"].includes(first);
}

function todayIso() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function promotionIsVisible(settings: ProGrowthSettings) {
  const today = todayIso();

  return Boolean(settings.pro_promotions_enabled) &&
    Boolean(settings.promotion_active) &&
    (!settings.promotion_start_date || today >= settings.promotion_start_date) &&
    (!settings.promotion_end_date || today <= settings.promotion_end_date);
}

function directImage(url?: null | string) {
  const value = String(url || "").trim();

  if (
    value &&
    (value.startsWith("http://") ||
      value.startsWith("https://") ||
      value.startsWith("data:image/"))
  ) {
    return value;
  }

  return "";
}

const initialBackground = {
  client_background_url: "",
  admin_background_url: "",
  client_background_opacity: 0.18,
  admin_background_opacity: 0.12,
};

const photoFields: PhotoFieldConfig[] = [
  { urlKey: "before_image_url", labelKey: "before_image_label", title: "Antes" },
  { urlKey: "process_image_url", labelKey: "process_image_label", title: "Processo" },
  { urlKey: "final_image_url", labelKey: "final_image_label", title: "Finalizado" },
];

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const initialMedia = {
  logo_url: "",
  before_image_url: "",
  process_image_url: "",
  final_image_url: "",
  before_image_label: "Antes",
  process_image_label: "Processo",
  final_image_label: "Finalizado",
};

const initialGrowth = {
  pro_service_delete_enabled: true,
  pro_backplate_enabled: false,
  pro_appearance_media_enabled: false,
  pro_promotions_enabled: false,
  pro_loyalty_enabled: false,
  pro_waitlist_enabled: false,
  pro_instagram_enabled: false,
  pro_google_client_enabled: false,
  promotion_active: false,
  promotion_title: "Promoção online",
  promotion_description: "",
  promotion_discount: 10,
  promotion_start_date: "",
  promotion_end_date: "",
  loyalty_enabled: false,
  loyalty_reward_description: "",
  loyalty_visit_goal: 5,
  loyalty_discount: 20,
  instagram_url: "",
  google_client_login_enabled: false,
  theme_color: "#22c55e",
};

function ClientFeatureBanner({ growth, images }: ClientFeatureBannerProps) {
  const showPromotion = promotionIsVisible(growth);

  if (
    !showPromotion &&
    !(growth.pro_loyalty_enabled && growth.loyalty_enabled) &&
    !(growth.pro_instagram_enabled && growth.instagram_url) &&
    !(growth.pro_google_client_enabled && growth.google_client_login_enabled) &&
    !(growth.pro_appearance_media_enabled && images.length)
  ) {
    return null;
  }

  return (
    <>
      {growth.pro_appearance_media_enabled && images.length ? (
        <section className="portfolio proImageGallery">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              style={{
                backgroundImage: `linear-gradient(180deg,rgba(0,0,0,.02),rgba(0,0,0,.56)), url(${image.url})`,
              }}
            >
              <span>{image.label}</span>
            </div>
          ))}
        </section>
      ) : null}

      <section className="safeFeatureClientBanner">
        {showPromotion ? (
          <div>
            <strong>{growth.promotion_title}</strong>
            <p>{growth.promotion_description}</p>
            {Number(growth.promotion_discount) > 0 ? (
              <span>{growth.promotion_discount}% de desconto</span>
            ) : null}
          </div>
        ) : null}

        {growth.pro_loyalty_enabled && growth.loyalty_enabled ? (
          <p>Fidelidade: {growth.loyalty_reward_description}</p>
        ) : null}

        <div className="safeFeatureActions">
          {growth.pro_instagram_enabled && growth.instagram_url ? (
            <a href={growth.instagram_url} target="_blank" rel="noreferrer">
              Abrir Instagram
            </a>
          ) : null}
          {growth.pro_google_client_enabled && growth.google_client_login_enabled ? (
            <span>Login Google do cliente ativo</span>
          ) : null}
        </div>
      </section>
    </>
  );
}

function AppearancePanel({
  slug,
  background,
  media,
  growth,
  message,
  saving,
  images,
  setBackground,
  setMedia,
  setGrowth,
  setMessage,
  setSaving,
  reload,
}: AppearancePanelProps) {
  async function savePremiumAppearance() {
    setSaving("premiumAppearance");
    setMessage("");

    try {
      const { error } = await supabase.rpc("save_premium_appearance", {
        target_slug: slug,
        logo_url_input: media.logo_url || "",
        theme_color_input: growth.theme_color || "#22c55e",
        client_background_url_input: background.client_background_url || "",
        admin_background_url_input: background.admin_background_url || "",
        client_background_opacity_input: Number(background.client_background_opacity || 0.18),
        admin_background_opacity_input: Number(background.admin_background_opacity || 0.12),
        before_image_url_input: media.before_image_url || "",
        process_image_url_input: media.process_image_url || "",
        final_image_url_input: media.final_image_url || "",
        before_image_label_input: media.before_image_label || "Antes",
        process_image_label_input: media.process_image_label || "Processo",
        final_image_label_input: media.final_image_label || "Finalizado",
      });

      if (error) throw error;

      setMessage("Aparência premium salva.");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error, "Não foi possível salvar a aparência."));
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="safeFeaturePanel appearancePremium">
      <div className="safeFeatureHeader">
        <div>
          <span>Aparência</span>
          <h2>Aparência premium da barbearia</h2>
          <p>Personalize logo, cor, fundos e fotos do cliente com prévia antes de salvar.</p>
        </div>
        <a href={`/${slug}`}>Ver tela do cliente</a>
      </div>

      {message ? <div className="safeFeatureNotice">{message}</div> : null}

      <div className="appearancePremiumGrid">
        <div className="safeFeatureCard appearanceBrandCard">
          <h3>Identidade da barbearia</h3>
          <label>Logo da barbearia</label>
          <input
            value={media.logo_url || ""}
            onChange={(event) => setMedia((current) => ({ ...current, logo_url: event.target.value }))}
            placeholder="https://site.com/logo.png"
          />
          <div className="logoPreview">
            {directImage(media.logo_url) ? <img src={media.logo_url} alt="Logo da barbearia" /> : <span>Logo</span>}
          </div>

          <label>Cor principal</label>
          <input
            type="color"
            value={growth.theme_color || "#22c55e"}
            onChange={(event) => setGrowth((current) => ({ ...current, theme_color: event.target.value }))}
          />
          <p className="fieldHint">A cor principal ajuda a deixar o painel com a identidade da barbearia.</p>
        </div>

        {growth.pro_backplate_enabled ? (
          <div className="safeFeatureCard">
            <h3>Planos de fundo</h3>
            <label>Imagem de fundo do cliente</label>
            <input
              value={background.client_background_url}
              onChange={(event) =>
                setBackground((current) => ({ ...current, client_background_url: event.target.value }))
              }
              placeholder="https://site.com/fundo-cliente.jpg"
            />
            {directImage(background.client_background_url) ? (
              <div className="imagePreview" style={{ backgroundImage: `url(${background.client_background_url})` }}>
                <button
                  type="button"
                  onClick={() => setBackground((current) => ({ ...current, client_background_url: "" }))}
                >
                  Limpar
                </button>
              </div>
            ) : (
              <p className="fieldHint">Use link direto .jpg, .png ou .webp.</p>
            )}

            <label>Opacidade cliente</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={background.client_background_opacity}
              onChange={(event) =>
                setBackground((current) => ({
                  ...current,
                  client_background_opacity: event.target.value,
                }))
              }
            />

            <label>Imagem de fundo do painel</label>
            <input
              value={background.admin_background_url}
              onChange={(event) =>
                setBackground((current) => ({ ...current, admin_background_url: event.target.value }))
              }
              placeholder="https://site.com/fundo-painel.jpg"
            />
            {directImage(background.admin_background_url) ? (
              <div className="imagePreview" style={{ backgroundImage: `url(${background.admin_background_url})` }}>
                <button
                  type="button"
                  onClick={() => setBackground((current) => ({ ...current, admin_background_url: "" }))}
                >
                  Limpar
                </button>
              </div>
            ) : null}

            <label>Opacidade painel</label>
            <input
              type="number"
              min="0"
              max="0.7"
              step="0.05"
              value={background.admin_background_opacity}
              onChange={(event) =>
                setBackground((current) => ({
                  ...current,
                  admin_background_opacity: event.target.value,
                }))
              }
            />
          </div>
        ) : (
          <div className="safeFeatureCard">
            <h3>Backplate desativado</h3>
            <p>Ative em Melhorias para liberar os fundos do cliente e do painel.</p>
          </div>
        )}

        {growth.pro_appearance_media_enabled ? (
          <div className="safeFeatureCard appearancePhotos">
            <h3>Fotos Antes / Processo / Finalizado</h3>
            {photoFields.map(({ urlKey, labelKey, title }) => (
              <div className="photoConfig" key={urlKey}>
                <label>Foto {title}</label>
                <input
                  value={media[urlKey] || ""}
                  onChange={(event) => setMedia((current) => ({ ...current, [urlKey]: event.target.value }))}
                  placeholder={`https://site.com/${String(title).toLowerCase()}.jpg`}
                />
                {directImage(media[urlKey]) ? (
                  <div className="imagePreview photoPreview" style={{ backgroundImage: `url(${media[urlKey]})` }}>
                    <button
                      type="button"
                      onClick={() => setMedia((current) => ({ ...current, [urlKey]: "" }))}
                    >
                      Limpar
                    </button>
                  </div>
                ) : (
                  <div className="emptyPreview">Prévia da imagem</div>
                )}
                <label>Legenda {title}</label>
                <input
                  value={media[labelKey] || title}
                  onChange={(event) => setMedia((current) => ({ ...current, [labelKey]: event.target.value }))}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="safeFeatureCard">
            <h3>Fotos do cliente desativadas</h3>
            <p>Ative em Melhorias para liberar as fotos Antes, Processo e Finalizado.</p>
          </div>
        )}

        <div className="safeFeatureCard clientScreenPreview">
          <h3>Prévia da tela do cliente</h3>
          <div className="phonePreview" style={{ borderColor: growth.theme_color || "#22c55e" }}>
            {directImage(background.client_background_url) ? (
              <div
                className="phoneBg"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.78)), url(${background.client_background_url})`,
                }}
              />
            ) : null}
            <div className="phoneContent">
              {directImage(media.logo_url) ? <img src={media.logo_url} alt="Logo" /> : <div className="phoneLogo">Logo</div>}
              <strong>Agende seu horário</strong>
              <small>Escolha serviço, profissional e horário disponível.</small>
              <div className="phoneButton" style={{ background: growth.theme_color || "#22c55e" }}>
                Continuar
              </div>
              {growth.pro_appearance_media_enabled && images.length ? (
                <div className="miniGallery">
                  {images.slice(0, 3).map((image, index) => (
                    <span key={`${image.url}-${index}`} style={{ backgroundImage: `url(${image.url})` }}>
                      {image.label}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="safeFeatureCard appearanceActions">
          <h3>Salvar aparência</h3>
          <p>Salva logo, cor principal, fundos e fotos em uma única ação.</p>
          <button type="button" disabled={saving === "premiumAppearance"} onClick={savePremiumAppearance}>
            {saving === "premiumAppearance" ? "Salvando..." : "Salvar aparência"}
          </button>
          <button type="button" className="secondaryModuleButton" onClick={() => window.open(`/${slug}`, "_blank")}>
            Ver tela do cliente
          </button>
        </div>
      </div>
    </section>
  );
}

function ImprovementsPanel({
  growth,
  message,
  saving,
  waitlist,
  clients,
  setGrowth,
  setMessage,
  setSaving,
  reload,
}: ImprovementsPanelProps) {
  const modules: ModuleGroup[] = [
    {
      group: "Serviços",
      items: [
        {
          key: "pro_service_delete_enabled",
          title: "Excluir serviço seguro",
          desc: "Permite remover um serviço da vitrine sem apagar agendamentos antigos.",
          tab: "services",
          depends: "Precisa existir pelo menos um serviço cadastrado.",
        },
      ],
    },
    {
      group: "Aparência",
      items: [
        {
          key: "pro_backplate_enabled",
          title: "Backplate",
          desc: "Libera plano de fundo personalizado para cliente e painel.",
          tab: "appearance",
          depends: "Usa link direto de imagem .jpg, .png ou .webp.",
        },
        {
          key: "pro_appearance_media_enabled",
          title: "Fotos Antes / Processo / Finalizado",
          desc: "Mostra três fotos no painel do cliente, com legenda opcional.",
          tab: "appearance",
          depends: "Precisa cadastrar os links das imagens na aba Aparência.",
        },
      ],
    },
    {
      group: "Marketing",
      items: [
        {
          key: "pro_promotions_enabled",
          title: "Promoções",
          desc: "Exibe promoção ativa no painel do cliente.",
          tab: "improvements",
          depends: "Também marque Promoção ativa e salve o texto/desconto.",
        },
        {
          key: "pro_instagram_enabled",
          title: "Instagram",
          desc: "Mostra botão direto para o Instagram da barbearia.",
          tab: "improvements",
          depends: "Informe o link do Instagram abaixo.",
        },
      ],
    },
    {
      group: "Clientes",
      items: [
        {
          key: "pro_loyalty_enabled",
          title: "Fidelidade",
          desc: "Libera controle de pontos, visitas e recompensa para clientes.",
          tab: "improvements",
          depends: "Também ative Fidelidade e salve a recompensa.",
        },
        {
          key: "pro_waitlist_enabled",
          title: "Lista de espera",
          desc: "Permite acompanhar clientes aguardando horário.",
          tab: "improvements",
          depends: "Depende de clientes entrarem na lista de espera.",
        },
        {
          key: "pro_google_client_enabled",
          title: "Login Google cliente",
          desc: "Libera identificação do cliente com conta Google.",
          tab: "improvements",
          depends: "Também marque Login Google do cliente.",
        },
      ],
    },
  ];

  function goTab(target: ModuleItem["tab"]) {
    try {
      window.__agendaProAdminTab = target;
      const labels: Record<ModuleItem["tab"], string> = {
        appearance: "Aparência",
        improvements: "Melhorias",
        services: "Serviços",
      };
      const button = [...document.querySelectorAll("button")].find(
        (item) => (item.textContent || "").trim().toLowerCase() === String(labels[target] || target).toLowerCase()
      );
      if (button instanceof HTMLButtonElement) button.click();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // Navegação auxiliar: se falhar, o painel principal continua funcionando.
    }
  }

  async function saveGrowth() {
    setSaving("growth");
    setMessage("");

    try {
      const { error } = await supabase.rpc("save_growth_settings", {
        target_slug: proSlug(),
        promotion_active_input: Boolean(growth.promotion_active),
        promotion_title_input: growth.promotion_title || "Promoção online",
        promotion_description_input: growth.promotion_description || "",
        promotion_discount_input: Number(growth.promotion_discount || 0),
        promotion_start_date_input: growth.promotion_start_date || null,
        promotion_end_date_input: growth.promotion_end_date || null,
        loyalty_enabled_input: Boolean(growth.loyalty_enabled),
        loyalty_reward_description_input: growth.loyalty_reward_description || "",
        loyalty_visit_goal_input: Number(growth.loyalty_visit_goal || 5),
        loyalty_discount_input: Number(growth.loyalty_discount || 0),
        instagram_url_input: growth.instagram_url || null,
        google_client_login_enabled_input: Boolean(growth.google_client_login_enabled),
      });

      if (error) throw error;

      setMessage("Configurações salvas. A liberação dos módulos PRO continua no Painel Plataforma.");
      await reload();
    } catch (error) {
      setMessage(errorMessage(error, "Não foi possível salvar as configurações."));
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="safeFeaturePanel improvementsCenter">
      <div className="safeFeatureHeader">
        <div>
          <span>Melhorias</span>
          <h2>Central de módulos PRO</h2>
          <p>Os módulos são liberados no Painel Plataforma. A barbearia configura apenas o que já estiver liberado.</p>
        </div>
      </div>

      {message ? <div className="safeFeatureNotice">{message}</div> : null}

      <div className="improvementGroups">
        {modules.map((group) => (
          <div className="improvementGroup" key={group.group}>
            <h3>{group.group}</h3>
            {group.items.map((item) => (
              <article className={growth[item.key] ? "improvementModule active" : "improvementModule"} key={item.key}>
                <div className="improvementTop">
                  <span className="moduleStatus">{growth[item.key] ? "Liberado" : "Bloqueado"}</span>
                  <strong>{item.title}</strong>
                </div>
                <p>{item.desc}</p>
                <small>{growth[item.key] ? item.depends : "Este recurso ainda não foi liberado no Painel Plataforma."}</small>
                <div className="moduleActions">
                  <button
                    type="button"
                    className="secondaryModuleButton"
                    disabled={!growth[item.key]}
                    onClick={() => goTab(item.tab)}
                  >
                    {growth[item.key] ? "Configurar" : "Aguardando liberação"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>

      <div className="safeFeatureGrid">
        <div className="safeFeatureCard">
          <h3>Configuração de promoções</h3>
          <label>
            <input
              type="checkbox"
              disabled={!growth.pro_promotions_enabled}
              checked={Boolean(growth.promotion_active)}
              onChange={(event) => setGrowth((current) => ({ ...current, promotion_active: event.target.checked }))}
            />
            Promoção ativa
          </label>
          <input
            disabled={!growth.pro_promotions_enabled}
            value={growth.promotion_title || ""}
            onChange={(event) => setGrowth((current) => ({ ...current, promotion_title: event.target.value }))}
            placeholder="Título da promoção"
          />
          <textarea
            disabled={!growth.pro_promotions_enabled}
            value={growth.promotion_description || ""}
            onChange={(event) => setGrowth((current) => ({ ...current, promotion_description: event.target.value }))}
            placeholder="Descrição da promoção"
          />
          <input
            disabled={!growth.pro_promotions_enabled}
            type="number"
            value={growth.promotion_discount || 0}
            onChange={(event) => setGrowth((current) => ({ ...current, promotion_discount: event.target.value }))}
            placeholder="Desconto %"
          />
          <button type="button" disabled={saving === "growth" || !growth.pro_promotions_enabled} onClick={saveGrowth}>
            {saving === "growth" ? "Salvando..." : "Salvar promoção"}
          </button>
        </div>

        <div className="safeFeatureCard">
          <h3>Configuração de fidelidade</h3>
          <label>
            <input
              type="checkbox"
              disabled={!growth.pro_loyalty_enabled}
              checked={Boolean(growth.loyalty_enabled)}
              onChange={(event) => setGrowth((current) => ({ ...current, loyalty_enabled: event.target.checked }))}
            />
            Fidelidade ativa
          </label>
          <textarea
            disabled={!growth.pro_loyalty_enabled}
            value={growth.loyalty_reward_description || ""}
            onChange={(event) =>
              setGrowth((current) => ({ ...current, loyalty_reward_description: event.target.value }))
            }
            placeholder="Recompensa do cliente"
          />
          <button type="button" disabled={saving === "growth" || !growth.pro_loyalty_enabled} onClick={saveGrowth}>
            {saving === "growth" ? "Salvando..." : "Salvar fidelidade"}
          </button>

          {growth.pro_loyalty_enabled
            ? clients.slice(0, 5).map((client) => (
                <article className="safeFeatureRow" key={client.id || client.whatsapp}>
                  <span>
                    <strong>{client.name}</strong>
                    <small>
                      {client.visit_count || 0} visitas · {client.loyalty_points || 0} pontos
                    </small>
                  </span>
                </article>
              ))
            : null}
        </div>

        {growth.pro_waitlist_enabled ? (
          <div className="safeFeatureCard">
            <h3>Lista de espera</h3>
            {waitlist.length ? (
              waitlist.slice(0, 8).map((item) => (
                <article className="safeFeatureRow" key={item.id}>
                  <span>
                    <strong>{item.client_name}</strong>
                    <small>
                      {item.preferred_date || "Sem data"} · {item.service_text || "Serviço"}
                    </small>
                    <small>{item.whatsapp}</small>
                  </span>
                </article>
              ))
            ) : (
              <p>Nenhum cliente aguardando.</p>
            )}
          </div>
        ) : null}

        <div className="safeFeatureCard">
          <h3>Instagram e Google</h3>
          <input
            disabled={!growth.pro_instagram_enabled}
            value={growth.instagram_url || ""}
            onChange={(event) => setGrowth((current) => ({ ...current, instagram_url: event.target.value }))}
            placeholder="https://instagram.com/sua_barbearia"
          />
          <label>
            <input
              type="checkbox"
              disabled={!growth.pro_google_client_enabled}
              checked={Boolean(growth.google_client_login_enabled)}
              onChange={(event) =>
                setGrowth((current) => ({ ...current, google_client_login_enabled: event.target.checked }))
              }
            />
            Login Google do cliente
          </label>
          <button
            type="button"
            disabled={saving === "growth" || (!growth.pro_instagram_enabled && !growth.pro_google_client_enabled)}
            onClick={saveGrowth}
          >
            {saving === "growth" ? "Salvando..." : "Salvar canais"}
          </button>
        </div>
      </div>
    </section>
  );
}

export default function AppProFeatures() {
  const slug = proSlug();
  const [context, setContext] = useState<ProContext>({ tab: "", admin: false });
  const [background, setBackground] = useState<ProBackgroundSettings>(initialBackground);
  const [media, setMedia] = useState<ProMediaSettings>(initialMedia);
  const [growth, setGrowth] = useState<ProGrowthSettings>(initialGrowth);
  const [waitlist, setWaitlist] = useState<ProWaitlistEntry[]>([]);
  const [clients, setClients] = useState<ProClient[]>([]);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");

  async function loadPro() {
    if (!slug) return;

    const columns = [
      "logo_url",
      "theme_color",
      "client_background_url",
      "admin_background_url",
      "client_background_opacity",
      "admin_background_opacity",
      "before_image_url",
      "process_image_url",
      "final_image_url",
      "before_image_label",
      "process_image_label",
      "final_image_label",
      "pro_service_delete_enabled",
      "pro_backplate_enabled",
      "pro_appearance_media_enabled",
      "pro_promotions_enabled",
      "pro_loyalty_enabled",
      "pro_waitlist_enabled",
      "pro_instagram_enabled",
      "pro_google_client_enabled",
      "promotion_active",
      "promotion_title",
      "promotion_description",
      "promotion_discount",
      "promotion_start_date",
      "promotion_end_date",
      "loyalty_enabled",
      "loyalty_reward_description",
      "loyalty_visit_goal",
      "loyalty_discount",
      "instagram_url",
      "google_client_login_enabled",
    ].join(",");

    const [shopResult, waitlistResult, clientsResult] = await Promise.allSettled([
      supabase.from("barbershops").select(columns).eq("slug", slug).single(),
      supabase.rpc("get_admin_waitlist", { target_slug: slug }),
      supabase.rpc("get_loyalty_clients", { target_slug: slug }),
    ]);

    const shop =
      shopResult.status === "fulfilled" ? (shopResult.value.data as ProShopSettings | null) : null;

    if (shop) {
      setBackground({
        client_background_url: shop.client_background_url || "",
        admin_background_url: shop.admin_background_url || "",
        client_background_opacity: shop.client_background_opacity || 0.18,
        admin_background_opacity: shop.admin_background_opacity || 0.12,
      });
      setMedia({
        logo_url: shop.logo_url || "",
        before_image_url: shop.before_image_url || "",
        process_image_url: shop.process_image_url || "",
        final_image_url: shop.final_image_url || "",
        before_image_label: shop.before_image_label || "Antes",
        process_image_label: shop.process_image_label || "Processo",
        final_image_label: shop.final_image_label || "Finalizado",
      });
      setGrowth((current) => ({ ...current, ...shop }));
    }

    setWaitlist(
      waitlistResult.status === "fulfilled"
        ? ((waitlistResult.value.data || []) as ProWaitlistEntry[])
        : []
    );
    setClients(
      clientsResult.status === "fulfilled" ? ((clientsResult.value.data || []) as ProClient[]) : []
    );
  }

  useEffect(() => {
    const tick = () =>
      setContext({
        tab: window.__agendaProAdminTab || "",
        admin: window.__agendaProViewMode === "admin" && window.__agendaProAdminLoggedIn === true,
      });

    tick();
    const id = setInterval(tick, 400);

    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    loadPro();
  }, [slug]);

  useEffect(() => {
    let layer = document.getElementById("agendaProBackgroundLayer");

    if (!layer) {
      layer = document.createElement("div");
      layer.id = "agendaProBackgroundLayer";
      Object.assign(layer.style, {
        position: "fixed",
        inset: "0",
        zIndex: "0",
        pointerEvents: "none",
        backgroundSize: "cover",
        backgroundPosition: "center",
      });
      document.body.prepend(layer);
      document.body.style.position = "relative";
    }

    const url = growth.pro_backplate_enabled
      ? context.admin
        ? background.admin_background_url
        : background.client_background_url
      : "";
    const opacity = Number(
      context.admin ? background.admin_background_opacity : background.client_background_opacity
    ) || 0;

    if (!directImage(url)) {
      layer.style.opacity = "0";
      layer.style.backgroundImage = "";
      return;
    }

    layer.style.opacity = String(Math.max(0, Math.min(opacity, 0.7)));
    layer.style.backgroundImage = `linear-gradient(rgba(7,10,13,.72),rgba(7,10,13,.72)), url('${String(
      url
    ).replace(/'/g, "%27")}')`;
  }, [background, growth.pro_backplate_enabled, context.admin]);

  const images = photoFields
    .map(({ urlKey, labelKey }) => ({
      url: directImage(media[urlKey]),
      label: media[labelKey],
    }))
    .filter((item): item is ImageItem => Boolean(item.url));

  if (!context.admin && proClient()) return null;

  if (!context.admin) return null;
  if (context.tab === "services") return null;

  if (context.tab === "appearance") {
    return (
      <AppearancePanel
        slug={slug}
        background={background}
        media={media}
        growth={growth}
        message={message}
        saving={saving}
        images={images}
        setBackground={setBackground}
        setMedia={setMedia}
        setGrowth={setGrowth}
        setMessage={setMessage}
        setSaving={setSaving}
        reload={loadPro}
      />
    );
  }

  if (context.tab === "improvements") {
    return (
      <ImprovementsPanel
        growth={growth}
        message={message}
        saving={saving}
        waitlist={waitlist}
        clients={clients}
        setGrowth={setGrowth}
        setMessage={setMessage}
        setSaving={setSaving}
        reload={loadPro}
      />
    );
  }

  return null;
}
