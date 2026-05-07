// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const featureLabels = {
  pix: "PIX antecipado",
  auto_confirmation: "Confirmação WhatsApp",
  promotions: "Promoções",
  waitlist: "Lista de espera",
  loyalty: "Fidelidade",
  google_login: "Login Google do cliente",
  instagram_booking: "Instagram",
  unique_link: "Link de remarcar/cancelar",
};

function makeSlug(value = "") {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function errorText(error) {
  if (!error) return "Erro desconhecido.";
  return error.message || error.details || error.hint || String(error);
}

function emptyForm() {
  return {
    name: "",
    slug: "",
    whatsapp: "",
    owner_email: "",
    plan: "professional",
    monthly_status: "active",
    next_billing_date: "",
    address: "",
    pix_key: "",
    theme_color: "#22c55e",
  };
}

function statusBadge(status) {
  if (status === "blocked") return <b className="statusBlocked">Bloqueado</b>;
  if (status === "trial") return <b className="statusTrial">Teste</b>;
  return <b className="statusActive">Ativo</b>;
}

function StatCard({ label, value }) {
  return (
    <div className="platformStat">
      <span>{label}</span>
      <strong>{value ?? "—"}</strong>
    </div>
  );
}

export default function PlatformDashboard() {
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [message, setMessage] = useState("");
  const [dashboard, setDashboard] = useState({ stats: {}, barbershops: [] });
  const [newShop, setNewShop] = useState(emptyForm());
  const [selectedShop, setSelectedShop] = useState(null);
  const [saving, setSaving] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);

  const shops = dashboard?.barbershops || [];

  const sortedShops = useMemo(() => {
    return [...shops].sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }, [shops]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setChecking(true);
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data?.session || null);
      await checkDeveloper(data?.session || null);
      setChecking(false);
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession || null);
      await checkDeveloper(nextSession || null);
    });

    boot();

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function checkDeveloper(currentSession = session) {
    if (!currentSession?.user?.email) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Faça login com o Google desenvolvedor para puxar e salvar os dados na nuvem.");
      return;
    }

    const { data, error } = await supabase.rpc("is_platform_admin");
    if (error || data !== true) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Este e-mail não está liberado como desenvolvedor da plataforma.");
      return;
    }

    setIsDeveloper(true);
    setMessage("");
    await loadDashboard();
  }

  async function loadDashboard() {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_platform_dashboard");
    if (error) {
      setMessage("Não foi possível puxar dados da nuvem: " + errorText(error));
      setLoading(false);
      return;
    }
    setDashboard(data || { stats: {}, barbershops: [] });
    setLoading(false);
  }

  async function login() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/plataforma?platform=1` },
    });
    if (error) setMessage(errorText(error));
  }

  async function logout() {
    await supabase.auth.signOut();
    setIsDeveloper(false);
    setSession(null);
    setDashboard({ stats: {}, barbershops: [] });
    setMessage("Você saiu do Painel AgendaPro.");
  }

  function updateNewShop(field, value) {
    setNewShop((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugTouched) next.slug = makeSlug(value);
      if (field === "slug") next.slug = makeSlug(value);
      return next;
    });
  }

  async function createShop(event) {
    event.preventDefault();
    setSaving("create");
    setMessage("");

    const { data, error } = await supabase.rpc("create_barbershop_full", {
      name_input: newShop.name,
      slug_input: newShop.slug || makeSlug(newShop.name),
      whatsapp_input: onlyDigits(newShop.whatsapp),
      owner_email_input: newShop.owner_email,
      plan_input: newShop.plan,
      monthly_status_input: newShop.monthly_status,
      next_billing_date_input: newShop.next_billing_date || null,
      address_input: newShop.address,
      pix_key_input: newShop.pix_key,
      theme_color_input: newShop.theme_color || "#22c55e",
    });

    setSaving("");

    if (error) {
      setMessage(errorText(error));
      return;
    }

    setMessage(`Barbearia cadastrada. Cliente: ${data?.link_cliente || ""} Painel: ${data?.link_painel || ""}`);
    setNewShop(emptyForm());
    setSlugTouched(false);
    await loadDashboard();
  }

  async function saveShop(event) {
    event.preventDefault();
    if (!selectedShop) return;
    setSaving("shop");
    setMessage("");

    const { error } = await supabase.rpc("update_platform_barbershop", {
      target_slug: selectedShop.slug,
      name_input: selectedShop.name,
      whatsapp_input: onlyDigits(selectedShop.whatsapp),
      owner_email_input: selectedShop.owner_email,
      plan_input: selectedShop.plan,
      monthly_status_input: selectedShop.monthly_status,
      next_billing_date_input: selectedShop.next_billing_date || null,
      address_input: selectedShop.address,
      pix_key_input: selectedShop.pix_key,
      theme_color_input: selectedShop.theme_color || "#22c55e",
    });

    setSaving("");

    if (error) {
      setMessage(errorText(error));
      return;
    }

    setMessage("Barbearia atualizada com sucesso.");
    await loadDashboard();
  }

  async function saveFeatures() {
    if (!selectedShop) return;
    setSaving("features");
    setMessage("");

    const features = Object.keys(featureLabels).map((key) => ({
      feature_key: key,
      released: Boolean(selectedShop.features?.[key]?.released),
      enabled: Boolean(selectedShop.features?.[key]?.enabled),
    }));

    const { error } = await supabase.rpc("save_platform_feature_flags", {
      target_slug: selectedShop.slug,
      features_input: features,
    });

    setSaving("");

    if (error) {
      setMessage(errorText(error));
      return;
    }

    setMessage("Funções atualizadas com sucesso.");
    await loadDashboard();
  }

  function updateSelected(field, value) {
    setSelectedShop((current) => ({ ...current, [field]: value }));
  }

  function updateFeature(key, field, value) {
    setSelectedShop((current) => ({
      ...current,
      features: {
        ...(current.features || {}),
        [key]: {
          ...(current.features?.[key] || {}),
          [field]: value,
        },
      },
    }));
  }

  if (checking || loading) {
    return (
      <main className="platformApp">
        <section className="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Carregando acesso e dados da nuvem...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!isDeveloper) {
    return (
      <main className="platformApp">
        <section className="platformHero platformLoginHero">
          <div>
            <span>Painel Plataforma</span>
            <h1>AgendaPro</h1>
            <p>Entre com o Google de desenvolvedor para cadastrar barbearias, liberar funções e administrar planos.</p>
            {message ? <p className="platformNotice">{message}</p> : null}
          </div>
          <button type="button" className="platformPrimary platformLoginButton" onClick={login}>Entrar com Google</button>
        </section>
      </main>
    );
  }

  return (
    <main className="platformApp">
      <header className="platformHero">
        <div>
          <span>Painel Plataforma</span>
          <h1>AgendaPro</h1>
          <p>Gerencie barbearias, planos, funções e suporte em um só lugar.</p>
          {session?.user?.email ? <small>Logado como {session.user.email}</small> : null}
        </div>
        <div className="platformHeroActions">
          <button type="button" className="platformSecondary" onClick={loadDashboard}>Atualizar</button>
          <button type="button" className="platformSecondary" onClick={logout}>Sair</button>
        </div>
      </header>

      {message ? <section className="platformCard platformNoticeCard">{message}</section> : null}

      <section className="platformStats">
        <StatCard label="Barbearias" value={dashboard.stats?.total || 0} />
        <StatCard label="Ativas" value={dashboard.stats?.active || 0} />
        <StatCard label="Bloqueadas" value={dashboard.stats?.blocked || 0} />
        <StatCard label="Próximo vencimento" value={dashboard.stats?.next_billing || "—"} />
      </section>

      <section className="platformGrid">
        <div className="platformCard platformNewShopCard">
          <div className="platformTitle">
            <div>
              <span>Cadastro</span>
              <h2>Nova barbearia</h2>
            </div>
          </div>
          <form className="platformForm" onSubmit={createShop}>
            <label>Nome da barbearia</label>
            <input value={newShop.name} onChange={(event) => updateNewShop("name", event.target.value)} placeholder="Barbearia do João" required />
            <label>Slug do link</label>
            <input value={newShop.slug} onChange={(event) => { setSlugTouched(true); updateNewShop("slug", event.target.value); }} placeholder="barbearia-do-joao" />
            <label>WhatsApp</label>
            <input value={newShop.whatsapp} onChange={(event) => updateNewShop("whatsapp", event.target.value)} placeholder="5551999999999" />
            <label>E-mail do dono</label>
            <input value={newShop.owner_email} onChange={(event) => updateNewShop("owner_email", event.target.value)} type="email" placeholder="dono@email.com" required />
            <div className="platformTwoCols">
              <span>
                <label>Plano</label>
                <select value={newShop.plan} onChange={(event) => updateNewShop("plan", event.target.value)}>
                  <option value="starter">Inicial</option>
                  <option value="professional">Profissional</option>
                  <option value="premium">Premium</option>
                </select>
              </span>
              <span>
                <label>Status</label>
                <select value={newShop.monthly_status} onChange={(event) => updateNewShop("monthly_status", event.target.value)}>
                  <option value="active">Ativo</option>
                  <option value="trial">Teste</option>
                  <option value="blocked">Bloqueado</option>
                </select>
              </span>
            </div>
            <label>Vencimento</label>
            <input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" />
            <label>Endereço</label>
            <input value={newShop.address} onChange={(event) => updateNewShop("address", event.target.value)} placeholder="Rua, número - bairro" />
            <label>Chave PIX</label>
            <input value={newShop.pix_key} onChange={(event) => updateNewShop("pix_key", event.target.value)} placeholder="CPF, CNPJ, e-mail ou telefone" />
            <label>Cor principal</label>
            <input value={newShop.theme_color} onChange={(event) => updateNewShop("theme_color", event.target.value)} type="color" />
            <button type="submit" className="platformPrimary" disabled={saving === "create"}>{saving === "create" ? "Cadastrando..." : "Cadastrar barbearia"}</button>
          </form>
        </div>

        <div className="platformCard">
          <div className="platformTitle">
            <div>
              <span>Clientes</span>
              <h2>Barbearias cadastradas</h2>
            </div>
          </div>
          <div className="platformShopList">
            {sortedShops.length ? sortedShops.map((shop) => (
              <article className="platformShop" key={shop.id || shop.slug}>
                <div>
                  <strong>{shop.name || "Sem nome"}</strong>
                  <span>{shop.slug}</span>
                  <small>{shop.owner_email || "Sem e-mail"} · {shop.plan || "sem plano"}</small>
                </div>
                <div className="platformShopActions">
                  {statusBadge(shop.monthly_status)}
                  <button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>
                  <a href={`/painel/${shop.slug}`} target="_blank" rel="noreferrer">Entrar no painel</a>
                  <a href={`/agendamento/${shop.slug}`} target="_blank" rel="noreferrer">Link cliente</a>
                </div>
              </article>
            )) : <p className="platformMuted">Nenhuma barbearia cadastrada.</p>}
          </div>
        </div>
      </section>

      <section className="platformCard" id="platformEditor">
        {!selectedShop ? (
          <p className="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p>
        ) : (
          <>
            <div className="platformTitle">
              <div>
                <span>Edição</span>
                <h2>{selectedShop.name}</h2>
              </div>
              <button type="button" className="platformSecondary" onClick={() => setSelectedShop(null)}>Fechar</button>
            </div>
            <form className="platformForm" onSubmit={saveShop}>
              <label>Nome</label>
              <input value={selectedShop.name || ""} onChange={(event) => updateSelected("name", event.target.value)} />
              <label>WhatsApp</label>
              <input value={selectedShop.whatsapp || ""} onChange={(event) => updateSelected("whatsapp", event.target.value)} />
              <label>E-mail do dono</label>
              <input value={selectedShop.owner_email || ""} onChange={(event) => updateSelected("owner_email", event.target.value)} type="email" />
              <div className="platformTwoCols">
                <span>
                  <label>Plano</label>
                  <select value={selectedShop.plan || "professional"} onChange={(event) => updateSelected("plan", event.target.value)}>
                    <option value="starter">Inicial</option>
                    <option value="professional">Profissional</option>
                    <option value="premium">Premium</option>
                  </select>
                </span>
                <span>
                  <label>Status</label>
                  <select value={selectedShop.monthly_status || "active"} onChange={(event) => updateSelected("monthly_status", event.target.value)}>
                    <option value="active">Ativo</option>
                    <option value="trial">Teste</option>
                    <option value="blocked">Bloqueado</option>
                  </select>
                </span>
              </div>
              <label>Vencimento</label>
              <input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" />
              <label>Endereço</label>
              <input value={selectedShop.address || ""} onChange={(event) => updateSelected("address", event.target.value)} />
              <label>Chave PIX</label>
              <input value={selectedShop.pix_key || ""} onChange={(event) => updateSelected("pix_key", event.target.value)} />
              <label>Cor principal</label>
              <input value={selectedShop.theme_color || "#22c55e"} onChange={(event) => updateSelected("theme_color", event.target.value)} type="color" />
              <button type="submit" className="platformPrimary" disabled={saving === "shop"}>{saving === "shop" ? "Salvando..." : "Salvar dados da barbearia"}</button>
            </form>

            <div className="platformFeatures">
              <h3>Funções liberadas</h3>
              {Object.keys(featureLabels).map((key) => {
                const item = selectedShop.features?.[key] || {};
                return (
                  <label className="platformFeature" key={key}>
                    <span>
                      <strong>{featureLabels[key]}</strong>
                      <small>{key}</small>
                    </span>
                    <span className="featureChecks">
                      <em>Liberado</em>
                      <input type="checkbox" checked={Boolean(item.released)} onChange={(event) => updateFeature(key, "released", event.target.checked)} />
                      <em>Ativo</em>
                      <input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateFeature(key, "enabled", event.target.checked)} />
                    </span>
                  </label>
                );
              })}
              <button type="button" className="platformPrimary" disabled={saving === "features"} onClick={saveFeatures}>{saving === "features" ? "Salvando..." : "Salvar funções"}</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
