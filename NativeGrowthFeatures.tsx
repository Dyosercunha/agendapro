// @ts-nocheck
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { supabase } from "./supabaseClient";

function slugFromUrl() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  const scheduleIndex = parts.indexOf("agendamento");
  const panelIndex = parts.indexOf("painel");
  return parts[scheduleIndex + 1] || parts[panelIndex + 1] || "master-barbearia";
}

function isPanelRoute() {
  return window.location.pathname.includes("/painel/");
}

function isClientRoute() {
  return window.location.pathname.includes("/agendamento/") || !isPanelRoute();
}

function todayIso() {
  const date = new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value) {
  if (!value) return "Sem data";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function activePromotion(settings) {
  if (!settings?.promotion_active) return false;
  const today = todayIso();
  if (settings.promotion_start_date && today < settings.promotion_start_date) return false;
  if (settings.promotion_end_date && today > settings.promotion_end_date) return false;
  return true;
}

function GrowthAdminPanel({ settings, setSettings, waitlist, loyaltyClients, onReload }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function update(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("save_growth_settings", {
      target_slug: slugFromUrl(),
      promotion_active_input: Boolean(settings.promotion_active),
      promotion_title_input: settings.promotion_title || "Promoção online",
      promotion_description_input: settings.promotion_description || "",
      promotion_discount_input: Number(settings.promotion_discount || 0),
      promotion_start_date_input: settings.promotion_start_date || null,
      promotion_end_date_input: settings.promotion_end_date || null,
      promotion_min_total_input: Number(settings.promotion_min_total || 0),
      loyalty_enabled_input: Boolean(settings.loyalty_enabled),
      loyalty_visit_goal_input: Number(settings.loyalty_visit_goal || 5),
      loyalty_reward_description_input: settings.loyalty_reward_description || "Benefício especial para clientes fiéis.",
      loyalty_discount_input: Number(settings.loyalty_discount || 0),
      instagram_url_input: settings.instagram_url || "",
      google_client_login_enabled_input: Boolean(settings.google_client_login_enabled),
    });
    setSaving(false);
    if (error) {
      setMessage(error.message || "Não foi possível salvar as configurações.");
      return;
    }
    setMessage("Configurações PRO salvas com sucesso.");
    onReload?.();
  }

  async function redeem(client) {
    if (!window.confirm(`Marcar uma recompensa como usada para ${client.name}?`)) return;
    const { error } = await supabase.rpc("redeem_client_loyalty", {
      target_slug: slugFromUrl(),
      target_whatsapp: client.whatsapp,
    });
    if (error) {
      window.alert(error.message || "Não foi possível resgatar a recompensa.");
      return;
    }
    window.alert("Recompensa resgatada.");
    onReload?.();
  }

  return (
    <section className="growthPanel">
      <div className="growthHeader">
        <div>
          <span>AgendaPro PRO</span>
          <h2>Crescimento da barbearia</h2>
          <p>Configure promoções, lista de espera, fidelidade, Instagram e login Google do cliente.</p>
        </div>
        <button type="button" onClick={save} disabled={saving}>{saving ? "Salvando..." : "Salvar recursos PRO"}</button>
      </div>

      {message ? <div className="growthNotice">{message}</div> : null}

      <div className="growthGrid">
        <div className="growthCard">
          <h3>Promoções inteligentes</h3>
          <label><input type="checkbox" checked={Boolean(settings.promotion_active)} onChange={(event) => update("promotion_active", event.target.checked)} /> Promoção ativa</label>
          <input value={settings.promotion_title || ""} onChange={(event) => update("promotion_title", event.target.value)} placeholder="Título da promoção" />
          <textarea value={settings.promotion_description || ""} onChange={(event) => update("promotion_description", event.target.value)} placeholder="Descrição da promoção" />
          <div className="growthTwoCols">
            <span><small>Desconto %</small><input type="number" min="0" max="80" value={settings.promotion_discount || 0} onChange={(event) => update("promotion_discount", event.target.value)} /></span>
            <span><small>Mínimo</small><input type="number" min="0" value={settings.promotion_min_total || 0} onChange={(event) => update("promotion_min_total", event.target.value)} /></span>
          </div>
          <div className="growthTwoCols">
            <span><small>Início</small><input type="date" value={settings.promotion_start_date || ""} onChange={(event) => update("promotion_start_date", event.target.value)} /></span>
            <span><small>Fim</small><input type="date" value={settings.promotion_end_date || ""} onChange={(event) => update("promotion_end_date", event.target.value)} /></span>
          </div>
        </div>

        <div className="growthCard">
          <h3>Fidelidade por cliente</h3>
          <label><input type="checkbox" checked={Boolean(settings.loyalty_enabled)} onChange={(event) => update("loyalty_enabled", event.target.checked)} /> Fidelidade ativa</label>
          <div className="growthTwoCols">
            <span><small>Meta de visitas</small><input type="number" min="1" value={settings.loyalty_visit_goal || 5} onChange={(event) => update("loyalty_visit_goal", event.target.value)} /></span>
            <span><small>Desconto %</small><input type="number" min="0" max="80" value={settings.loyalty_discount || 0} onChange={(event) => update("loyalty_discount", event.target.value)} /></span>
          </div>
          <textarea value={settings.loyalty_reward_description || ""} onChange={(event) => update("loyalty_reward_description", event.target.value)} placeholder="Descrição da recompensa" />
          <div className="growthList compact">
            {loyaltyClients.slice(0, 6).map((client) => (
              <article key={client.id || client.whatsapp}>
                <div>
                  <strong>{client.name}</strong>
                  <small>{client.visit_count || 0} visita(s) · {client.loyalty_points || 0} ponto(s)</small>
                </div>
                {client.loyalty_rewards_available > 0 ? <button type="button" onClick={() => redeem(client)}>Resgatar {client.loyalty_rewards_available}</button> : <span>Sem prêmio</span>}
              </article>
            ))}
          </div>
        </div>

        <div className="growthCard">
          <h3>Lista de espera completa</h3>
          <p className="growthMuted">Clientes aguardando horário, com data preferida e serviço desejado.</p>
          <div className="growthList">
            {waitlist.length ? waitlist.slice(0, 8).map((item) => (
              <article key={item.id}>
                <div>
                  <strong>{item.client_name}</strong>
                  <small>{formatDate(item.preferred_date)} · {item.service_text}</small>
                  <small>{item.whatsapp}</small>
                </div>
                <span>{item.status === "waiting" ? "Aguardando" : item.status}</span>
              </article>
            )) : <p className="growthMuted">Nenhum cliente na lista de espera.</p>}
          </div>
        </div>

        <div className="growthCard">
          <h3>Instagram e Google</h3>
          <small>Link direto do Instagram</small>
          <input value={settings.instagram_url || ""} onChange={(event) => update("instagram_url", event.target.value)} placeholder="https://instagram.com/sua_barbearia" />
          <label><input type="checkbox" checked={Boolean(settings.google_client_login_enabled)} onChange={(event) => update("google_client_login_enabled", event.target.checked)} /> Login Google para cliente</label>
          <p className="growthMuted">O Instagram aparece para o cliente na tela de agendamento. O Google prepara o app para histórico do cliente por conta.</p>
        </div>
      </div>
    </section>
  );
}

function ClientGrowthBanner({ settings }) {
  const promoActive = activePromotion(settings);

  async function googleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  if (!promoActive && !settings?.instagram_url && !settings?.google_client_login_enabled && !settings?.loyalty_enabled) return null;

  return (
    <section className="clientGrowthBanner">
      {promoActive ? (
        <div>
          <span>Promoção ativa</span>
          <h3>{settings.promotion_title || "Promoção online"}</h3>
          <p>{settings.promotion_description || "Desconto especial para agendamentos online."}</p>
          {Number(settings.promotion_discount) > 0 ? <strong>{settings.promotion_discount}% de desconto</strong> : null}
        </div>
      ) : null}
      {settings?.loyalty_enabled ? <p>Programa de fidelidade: {settings.loyalty_reward_description}</p> : null}
      <div className="clientGrowthActions">
        {settings?.instagram_url ? <a href={settings.instagram_url} target="_blank" rel="noreferrer">Abrir Instagram</a> : null}
        {settings?.google_client_login_enabled ? <button type="button" onClick={googleLogin}>Entrar com Google</button> : null}
      </div>
    </section>
  );
}

function GrowthMount({ children, targetSelector, id }) {
  useEffect(() => {
    let root;
    let host;
    let mounted = false;

    function mount() {
      if (mounted) return;
      if (document.getElementById(id)) return;
      const target = document.querySelector(targetSelector);
      if (!target) return;
      host = document.createElement("div");
      host.id = id;
      target.prepend(host);
      root = createRoot(host);
      root.render(children);
      mounted = true;
    }

    mount();
    const observer = new MutationObserver(() => window.requestAnimationFrame(mount));
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      root?.unmount?.();
      host?.remove?.();
    };
  }, [children, targetSelector, id]);

  return null;
}

export default function NativeGrowthFeatures() {
  const [settings, setSettings] = useState(null);
  const [waitlist, setWaitlist] = useState([]);
  const [loyaltyClients, setLoyaltyClients] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const slug = slugFromUrl();
      const [{ data: settingsData }, { data: waitlistData }, { data: loyaltyData }] = await Promise.all([
        supabase.rpc("get_growth_settings", { target_slug: slug }),
        supabase.rpc("get_admin_waitlist", { target_slug: slug }),
        supabase.rpc("get_loyalty_clients", { target_slug: slug }),
      ]);

      if (cancelled) return;
      setSettings(settingsData || {});
      setWaitlist(waitlistData || []);
      setLoyaltyClients(loyaltyData || []);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  if (!settings) return null;

  if (isPanelRoute()) {
    return (
      <GrowthMount id="agendaProGrowthAdmin" targetSelector=".adminApp">
        <GrowthAdminPanel settings={settings} setSettings={setSettings} waitlist={waitlist} loyaltyClients={loyaltyClients} onReload={() => setReloadKey((value) => value + 1)} />
      </GrowthMount>
    );
  }

  if (isClientRoute()) {
    return (
      <GrowthMount id="agendaProClientGrowth" targetSelector=".app">
        <ClientGrowthBanner settings={settings} />
      </GrowthMount>
    );
  }

  return null;
}
