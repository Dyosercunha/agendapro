// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";
import "./styles.css";

const featureLabels = {
  pix: "PIX antecipado",
  auto_confirmation: "Confirmação automática no WhatsApp",
  service_delete: "Excluir serviço seguro",
  backplate: "Plano de fundo personalizado",
  appearance_media: "Fotos Antes / Processo / Finalizado",
  promotions: "Promoções",
  waitlist: "Lista de espera",
  loyalty: "Fidelidade",
  instagram_booking: "Agendamento pelo Instagram",
  google_login: "Login Google do cliente",
  unique_link: "Link para remarcar/cancelar",
};

const planLabels = {
  starter: "Inicial",
  professional: "Profissional",
  premium: "Premium",
};

const statusOptions = [
  { value: "active", label: "Ativo" },
  { value: "trial", label: "Teste de 30 dias" },
  { value: "overdue", label: "Pagamento atrasado" },
  { value: "blocked", label: "Desativado" },
];

function makeSlug(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48);
}

function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

function errorText(error) {
  if (!error) return "Erro desconhecido.";
  return error.message || error.details || error.hint || String(error);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateText(value) {
  if (!value) return "Sem vencimento";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function buildCepAddress(cepData, number) {
  const street = cepData?.logradouro || "";
  const neighborhood = cepData?.bairro || "";
  const city = cepData?.localidade || "";
  const state = cepData?.uf || "";
  const cleanNumber = String(number || "").trim();

  if (!street || !cleanNumber) return "";

  return [
    `${street}, ${cleanNumber}`,
    neighborhood,
    city && state ? `${city} - ${state}` : city || state,
  ]
    .filter(Boolean)
    .join(" - ");
}

async function fetchCepAddress(cep, number) {
  const cleanCep = onlyDigits(cep);
  const cleanNumber = String(number || "").trim();

  if (cleanCep.length !== 8) {
    throw new Error("Informe um CEP válido com 8 números.");
  }

  if (!cleanNumber) {
    throw new Error("Informe o número do comércio antes de puxar o endereço pelo CEP.");
  }

  const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.erro) {
    throw new Error("CEP não encontrado. Cadastre o endereço manualmente.");
  }

  const address = buildCepAddress(data, cleanNumber);
  if (!address) {
    throw new Error("O CEP não trouxe rua válida ou está faltando o número do comércio. Cadastre manualmente.");
  }

  return address;
}

function emptyForm() {
  return {
    name: "",
    slug: "",
    whatsapp: "",
    owner_email: "",
    plan: "professional",
    monthly_status: "trial",
    next_billing_date: "",
    cep: "",
    address_number: "",
    address: "",
    pix_key: "",
    theme_color: "#22c55e",
    plan_price: 89,
  };
}

function statusBadge(status, label) {
  const value = label || status;
  if (value === "Desativado" || status === "blocked") return <b className="statusBlocked">Desativado</b>;
  if (value === "Pagamento atrasado" || status === "overdue") return <b className="statusOverdue">Pagamento atrasado</b>;
  if (value === "Teste de 30 dias" || status === "trial") return <b className="statusTrial">Teste de 30 dias</b>;
  return <b className="statusActive">Ativo</b>;
}

function StatCard({ label, value, hint }) {
  return (
    <div className="platformStat">
      <span>{label}</span>
      <strong>{value ?? "-"}</strong>
      {hint ? <small>{hint}</small> : null}
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
  const [filter, setFilter] = useState("all");

  const shops = dashboard?.barbershops || [];

  const filteredShops = useMemo(() => {
    return [...shops]
      .filter((shop) => filter === "all" || shop.status_label === filter || shop.monthly_status === filter)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }, [shops, filter]);

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

  async function fillNewShopAddressByCep() {
    setSaving("cep-create");
    setMessage("");
    try {
      const address = await fetchCepAddress(newShop.cep, newShop.address_number);
      updateNewShop("address", address);
      setMessage("Endereço encontrado pelo CEP. Confira antes de cadastrar.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function fillSelectedShopAddressByCep() {
    if (!selectedShop) return;
    setSaving("cep-shop");
    setMessage("");
    try {
      const address = await fetchCepAddress(selectedShop.cep, selectedShop.address_number);
      updateSelected("address", address);
      setMessage("Endereço encontrado pelo CEP. Confira antes de salvar.");
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function createShop(event) {
    event.preventDefault();
    setSaving("create");
    setMessage("");

    try {
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

      if (error) throw error;

      try {
        await supabase.rpc("update_platform_barbershop", {
          target_slug: newShop.slug || makeSlug(newShop.name),
          name_input: newShop.name,
          whatsapp_input: onlyDigits(newShop.whatsapp),
          owner_email_input: newShop.owner_email,
          plan_input: newShop.plan,
          monthly_status_input: newShop.monthly_status,
          next_billing_date_input: newShop.next_billing_date || null,
          address_input: newShop.address,
          pix_key_input: newShop.pix_key,
          theme_color_input: newShop.theme_color || "#22c55e",
          plan_price_input: Number(newShop.plan_price || 0),
        });
      } catch (_syncPriceError) {}

      setMessage(`Barbearia cadastrada. Cliente: ${data?.link_cliente || ""} Painel: ${data?.link_painel || ""}`);
      setNewShop(emptyForm());
      setSlugTouched(false);
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveShop(event) {
    event.preventDefault();
    if (!selectedShop) return;
    setSaving("shop");
    setMessage("");

    try {
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
        plan_price_input: Number(selectedShop.plan_price || 0),
      });

      if (error) throw error;

      setMessage("Barbearia atualizada com sucesso.");
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function hideShopFromPlatform(shop) {
    if (!shop?.slug) return;
    setSaving("hide-" + shop.slug);
    setMessage("");
    try {
      const { error } = await supabase.rpc("archive_platform_barbershop", { target_slug: shop.slug });
      if (error) throw error;
      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage("Barbearia removida da lista do painel. Ela continua cadastrada no banco de dados.");
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveFeatures() {
    if (!selectedShop) return;
    setSaving("features");
    setMessage("");

    try {
      const features = Object.keys(featureLabels).map((key) => ({
        feature_key: key,
        released: Boolean(selectedShop.features?.[key]?.released),
        enabled: Boolean(selectedShop.features?.[key]?.enabled),
      }));

      const { error } = await supabase.rpc("save_platform_feature_flags", {
        target_slug: selectedShop.slug,
        features_input: features,
      });

      if (error) throw error;

      setMessage("Funções atualizadas com sucesso.");
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function sendBillingReminders() {
    setSaving("reminders");
    setMessage("");

    try {
      const { data, error } = await supabase.rpc("get_platform_billing_reminders");
      if (error) throw error;

      const reminders = data || [];
      if (!reminders.length) {
        setMessage("Nenhuma barbearia com vencimento em 3 dias úteis para avisar hoje.");
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const item of reminders) {
        try {
          const response = await fetch("/api/send-whatsapp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: item.whatsapp, message: item.message }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || result.ok === false) throw new Error(result.error || "Falha ao enviar WhatsApp.");

          await supabase.rpc("mark_billing_reminder_sent", { target_slug: item.slug });
          sent += 1;
        } catch (_err) {
          failed += 1;
        }
      }

      setMessage(`Avisos de vencimento: ${sent} enviado(s), ${failed} com falha.`);
      await loadDashboard();
    } catch (error) {
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  function updateSelected(field, value) {
    setSelectedShop((current) => ({ ...current, [field]: value }));
  }

  function updateFeature(key, field, value) {
    setSelectedShop((current) => ({
      ...current,
      features: { ...(current.features || {}), [key]: { ...(current.features?.[key] || {}), [field]: value } },
    }));
  }

  if (checking || loading) {
    return (
      <main className="platformApp">
        <section className="platformHero platformLoginHero">
          <div><span>Painel Plataforma</span><h1>AgendaPro</h1><p>Carregando acesso e dados da nuvem...</p></div>
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
          <p>Controle de barbearias, planos, faturamento e vencimentos.</p>
          {session?.user?.email ? <small>Logado como {session.user.email}</small> : null}
        </div>
        <div className="platformHeroActions">
          <button type="button" className="platformSecondary" onClick={loadDashboard}>Atualizar</button>
          <button type="button" className="platformSecondary" disabled={saving === "reminders"} onClick={sendBillingReminders}>{saving === "reminders" ? "Enviando..." : "Enviar avisos de vencimento"}</button>
          <button type="button" className="platformSecondary" onClick={logout}>Sair</button>
        </div>
      </header>

      {message ? <section className="platformCard platformNoticeCard">{message}</section> : null}

      <section className="platformStats platformStatsPro">
        <StatCard label="Faturamento mensal previsto" value={money(dashboard.stats?.monthly_revenue || 0)} hint="Ativos + teste" />
        <StatCard label="Em atraso" value={money(dashboard.stats?.overdue_revenue || 0)} hint={`${dashboard.stats?.overdue || 0} barbearia(s)`} />
        <StatCard label="Ativas" value={dashboard.stats?.active || 0} hint={`${dashboard.stats?.trial || 0} em teste`} />
        <StatCard label="Desativadas" value={dashboard.stats?.blocked || 0} hint={`Próximo: ${dateText(dashboard.stats?.next_billing)}`} />
      </section>

      <section className="platformFilters">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button>
        <button type="button" className={filter === "Ativo" ? "active" : ""} onClick={() => setFilter("Ativo")}>Ativas</button>
        <button type="button" className={filter === "Teste de 30 dias" ? "active" : ""} onClick={() => setFilter("Teste de 30 dias")}>Teste</button>
        <button type="button" className={filter === "Pagamento atrasado" ? "active" : ""} onClick={() => setFilter("Pagamento atrasado")}>Atrasadas</button>
        <button type="button" className={filter === "Desativado" ? "active" : ""} onClick={() => setFilter("Desativado")}>Desativadas</button>
      </section>

      <section className="platformGrid">
        <div className="platformCard platformNewShopCard">
          <div className="platformTitle"><div><span>Cadastro</span><h2>Nova barbearia</h2></div></div>
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
              <span><label>Plano</label><select value={newShop.plan} onChange={(event) => updateNewShop("plan", event.target.value)}><option value="starter">Inicial</option><option value="professional">Profissional</option><option value="premium">Premium</option></select></span>
              <span><label>Status</label><select value={newShop.monthly_status} onChange={(event) => updateNewShop("monthly_status", event.target.value)}>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
            </div>
            <div className="platformTwoCols">
              <span><label>Vencimento</label><input value={newShop.next_billing_date} onChange={(event) => updateNewShop("next_billing_date", event.target.value)} type="date" /></span>
              <span><label>Valor mensal</label><input value={newShop.plan_price || ""} onChange={(event) => updateNewShop("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
            </div>
            <div className="platformTwoCols">
              <span><label>CEP</label><input value={newShop.cep || ""} onChange={(event) => updateNewShop("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
              <span><label>Número do comércio</label><input value={newShop.address_number || ""} onChange={(event) => updateNewShop("address_number", event.target.value)} placeholder="123" /></span>
            </div>
            <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-create"} onClick={fillNewShopAddressByCep}>{saving === "cep-create" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
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
          <div className="platformTitle"><div><span>Clientes</span><h2>Barbearias cadastradas</h2></div></div>
          <div className="platformShopList">
            {filteredShops.length ? filteredShops.map((shop) => (
              <article className="platformShop platformShopPro" key={shop.id || shop.slug}>
                <div>
                  <strong>{shop.name || "Sem nome"}</strong>
                  <span>{shop.slug}</span>
                  <small>{shop.owner_email || "Sem e-mail"}</small>
                  <div className="platformShopMeta">
                    <b>{shop.plan_label || planLabels[shop.plan] || shop.plan || "Sem plano"}</b>
                    <span>{money(shop.plan_price || 0)}/mês</span>
                    <span>Vence: {dateText(shop.next_billing_date)}</span>
                    {typeof shop.days_to_billing === "number" ? <span>{shop.days_to_billing} dia(s)</span> : null}
                  </div>
                </div>
                <div className="platformShopActions">
                  {statusBadge(shop.monthly_status, shop.status_label)}
                  <button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>
                  <a href={`/painel/${shop.slug}`} target="_blank" rel="noreferrer">Entrar no painel</a>
                  <a href={`/agendamento/${shop.slug}`} target="_blank" rel="noreferrer">Link cliente</a>
                  <button type="button" className="platformDanger" disabled={saving === "hide-" + shop.slug} onClick={() => hideShopFromPlatform(shop)}>{saving === "hide-" + shop.slug ? "Removendo..." : "Remover da lista"}</button>
                </div>
              </article>
            )) : <p className="platformMuted">Nenhuma barbearia encontrada nesse filtro.</p>}
          </div>
        </div>
      </section>

      <section className="platformCard" id="platformEditor">
        {!selectedShop ? <p className="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p> : (
          <>
            <div className="platformTitle"><div><span>Edição</span><h2>{selectedShop.name}</h2></div><button type="button" className="platformSecondary" onClick={() => setSelectedShop(null)}>Fechar</button></div>
            <form className="platformForm" onSubmit={saveShop}>
              <label>Nome</label><input value={selectedShop.name || ""} onChange={(event) => updateSelected("name", event.target.value)} />
              <label>WhatsApp</label><input value={selectedShop.whatsapp || ""} onChange={(event) => updateSelected("whatsapp", event.target.value)} />
              <label>E-mail do dono</label><input value={selectedShop.owner_email || ""} onChange={(event) => updateSelected("owner_email", event.target.value)} type="email" />
              <div className="platformTwoCols">
                <span><label>Plano</label><select value={selectedShop.plan || "professional"} onChange={(event) => updateSelected("plan", event.target.value)}><option value="starter">Inicial</option><option value="professional">Profissional</option><option value="premium">Premium</option></select></span>
                <span><label>Status</label><select value={selectedShop.monthly_status || "active"} onChange={(event) => updateSelected("monthly_status", event.target.value)}>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
              </div>
              <div className="platformTwoCols">
                <span><label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={selectedShop.plan_price ?? ""} onChange={(event) => updateSelected("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>
              <div className="platformTwoCols">
                <span><label>CEP</label><input value={selectedShop.cep || ""} onChange={(event) => updateSelected("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
                <span><label>Número do comércio</label><input value={selectedShop.address_number || ""} onChange={(event) => updateSelected("address_number", event.target.value)} placeholder="123" /></span>
              </div>
              <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-shop"} onClick={fillSelectedShopAddressByCep}>{saving === "cep-shop" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
              <label>Endereço</label><input value={selectedShop.address || ""} onChange={(event) => updateSelected("address", event.target.value)} />
              <label>Chave PIX</label><input value={selectedShop.pix_key || ""} onChange={(event) => updateSelected("pix_key", event.target.value)} />
              <label>Cor principal</label><input value={selectedShop.theme_color || "#22c55e"} onChange={(event) => updateSelected("theme_color", event.target.value)} type="color" />
              <button type="submit" className="platformPrimary" disabled={saving === "shop"}>{saving === "shop" ? "Salvando..." : "Salvar dados da barbearia"}</button>
            </form>
            <div className="platformFeatures">
              <h3>Funções liberadas por plano</h3><p className="platformMuted">Ative aqui e o recurso aparece automaticamente no lugar certo do painel da barbearia.</p>
              {Object.keys(featureLabels).map((key) => {
                const item = selectedShop.features?.[key] || {};
                return <label className="platformFeature" key={key}><span><strong>{featureLabels[key]}</strong><small>{key}</small></span><span className="featureChecks"><em>Liberado</em><input type="checkbox" checked={Boolean(item.released)} onChange={(event) => updateFeature(key, "released", event.target.checked)} /><em>Ativo</em><input type="checkbox" checked={Boolean(item.enabled)} onChange={(event) => updateFeature(key, "enabled", event.target.checked)} /></span></label>;
              })}
              <button type="button" className="platformPrimary" disabled={saving === "features"} onClick={saveFeatures}>{saving === "features" ? "Salvando..." : "Salvar funções"}</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
