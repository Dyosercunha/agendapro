// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import {
  getAdminAuthHealth,
  getAuthSession,
  loginWithEmailPassword,
  loginWithGoogleRedirect,
  logoutAuth,
  onAuthStateChange,
  syncAdminAuthUser,
} from "../../lib/authApi";
import { getWhatsappStatus, sendWhatsappMessage } from "../../lib/appointmentsApi";
import {
  archivePlatformBarbershop,
  callPlatformMaintenance as callPlatformMaintenanceRequest,
  createBarbershopFull,
  getDeployInfo,
  getPlatformBillingReminders,
  getPlatformDashboard,
  isPlatformAdmin,
  markBillingReminderSent,
  purgeArchivedBarbershops,
  savePlatformFeatureFlags,
  updatePlatformBarbershop,
} from "../../lib/platformApi";
import {
  planLabel as commercialPlanLabel,
  planOptions,
  planPriceFor,
  statusLabel as commercialStatusLabel,
  statusOptions,
} from "../../lib/commercial";
import { featureLabels } from "../../lib/features";
import { permissionScenarioMatrix } from "../../lib/permissions";
import "../../styles.css";

const creationStatusOptions = statusOptions.filter((item) => item.value !== "archived");

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

function isServiceRoleMissing(error) {
  return errorText(error).includes("SUPABASE_SERVICE_ROLE");
}

function ownerLoginErrorText(error) {
  if (isServiceRoleMissing(error)) {
    return "Barbearia salva, mas o login do dono não foi criado porque falta configurar SUPABASE_SERVICE_ROLE_KEY no Vercel. Depois de configurar, edite a barbearia e preencha a nova senha do dono.";
  }

  return errorText(error);
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dateText(value) {
  if (!value) return "Sem vencimento";
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

function futureDateText(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function withTimeout(promise, label, timeoutMs = 9000) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} demorou para responder. Atualize a página e tente novamente.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
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
    owner_password: "",
    plan: "professional",
    monthly_status: "trial",
    next_billing_date: "",
    cep: "",
    address_number: "",
    address: "",
    pix_key: "",
    theme_color: "#22c55e",
    plan_price: planPriceFor("professional"),
  };
}

function statusBadge(status, label) {
  const normalized = String(status || "").toLowerCase();
  const value = commercialStatusLabel(normalized) || label || status;

  if (normalized === "archived") return <b className="statusArchived">Arquivado</b>;
  if (normalized === "cancelled") return <b className="statusCancelled">Cancelado</b>;
  if (normalized === "blocked") return <b className="statusBlocked">Bloqueado</b>;
  if (normalized === "overdue") return <b className="statusOverdue">Atrasado</b>;
  if (normalized === "pending") return <b className="statusPending">Pendente</b>;
  if (normalized === "trial") return <b className="statusTrial">Teste 30 dias</b>;

  return <b className="statusActive">{value || "Ativo"}</b>;
}

function planLabel(plan) {
  return commercialPlanLabel(plan);
}

function statusLabel(status) {
  return commercialStatusLabel(status);
}

function normalizeAuditShop(shop = {}) {
  return {
    ...shop,
    plan_label: shop.plan_label || planLabel(shop.plan),
    status_label: statusLabel(shop.monthly_status),
    days_to_billing:
      typeof shop.days_to_billing === "number"
        ? shop.days_to_billing
        : shop.next_billing_date
        ? Math.ceil((new Date(shop.next_billing_date).getTime() - Date.now()) / 86400000)
        : null,
    source: shop.source || "diagnostics",
  };
}

function mergeShopLists(primary = [], fallback = []) {
  const map = new Map();

  fallback.forEach((shop) => {
    if (shop?.id || shop?.slug) map.set(shop.id || shop.slug, normalizeAuditShop(shop));
  });

  primary.forEach((shop) => {
    if (shop?.id || shop?.slug) {
      const key = shop.id || shop.slug;
      map.set(key, normalizeAuditShop({ ...(map.get(key) || {}), ...shop, source: "dashboard" }));
    }
  });

  return Array.from(map.values());
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

function checkedAtText() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function HealthItem({ label, status, detail, tone = "neutral" }) {
  return (
    <article className={`platformHealthItem ${tone}`}>
      <span>{label}</span>
      <strong>{status}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

function shortCommit(value = "") {
  return value ? String(value).slice(0, 7) : "Não informado";
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
  const [platformTab, setPlatformTab] = useState("barbershops");
  const [lastError, setLastError] = useState("");
  const [platformLogin, setPlatformLogin] = useState({ email: "appagenda.pro@gmail.com", password: "" });
  const [cloudAudit, setCloudAudit] = useState({ barbershops: [] });
  const [systemHealth, setSystemHealth] = useState({
    loading: false,
    checkedAt: "",
    supabase: null,
    rpc: null,
    auth: null,
    whatsapp: null,
    deploy: null,
    data: null,
  });

  const auditActiveShops = useMemo(
    () => (cloudAudit?.barbershops || []).filter((shop) => !shop.archived_at).map(normalizeAuditShop),
    [cloudAudit]
  );
  const archivedShops = useMemo(
    () => (cloudAudit?.barbershops || []).filter((shop) => shop.archived_at).map(normalizeAuditShop),
    [cloudAudit]
  );
  const shops = useMemo(
    () => mergeShopLists(dashboard?.barbershops || [], auditActiveShops),
    [dashboard?.barbershops, auditActiveShops]
  );

  const filteredShops = useMemo(() => {
    return [...shops]
      .filter((shop) => filter === "all" || shop.status_label === filter || shop.monthly_status === filter)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "pt-BR"));
  }, [shops, filter]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      setChecking(true);
      try {
        const { data } = await withTimeout(getAuthSession(), "A sessão");
        if (!mounted) return;
        setSession(data?.session || null);
        await checkDeveloper(data?.session || null);
      } catch (error) {
        if (!mounted) return;
        setIsDeveloper(false);
        setLoading(false);
        rememberError("Sessão Plataforma", error);
        setMessage("Não foi possível carregar sua sessão: " + errorText(error));
      } finally {
        if (mounted) setChecking(false);
      }
    }

    const { data: listener } = onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      if (!mounted) return;

      setSession(nextSession || null);

      window.setTimeout(async () => {
        if (!mounted) return;

        setChecking(true);
        try {
          await checkDeveloper(nextSession || null);
        } finally {
          if (mounted) setChecking(false);
        }
      }, 0);
    });

    boot();

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  async function checkDeveloper(currentSession = session) {
    try {
    if (!currentSession?.user?.email) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Faça login com o Google desenvolvedor para puxar e salvar os dados na nuvem.");
      return;
    }

    const { data, error } = await withTimeout(isPlatformAdmin(), "A verificação do desenvolvedor");
    if (error || data !== true) {
      setIsDeveloper(false);
      setLoading(false);
      setMessage("Este e-mail não está liberado como desenvolvedor da plataforma.");
      return;
    }

    setIsDeveloper(true);
    setMessage("");
    await loadDashboard();
    await checkSystemHealth();
    } catch (error) {
      setIsDeveloper(false);
      setLoading(false);
      rememberError("Validação do desenvolvedor", error);
      setMessage("Não foi possível validar o acesso do desenvolvedor: " + errorText(error));
    }
  }

  function rememberError(source, error) {
    const text = `${source}: ${errorText(error)}`;
    setLastError(text);
    return text;
  }

  async function checkSystemHealth() {
    setSystemHealth((current) => ({ ...current, loading: true }));

    const [adminResult, dashboardResult, maintenanceResult, authResult, whatsappResult, deployResult] =
      await Promise.allSettled([
        isPlatformAdmin(),
        getPlatformDashboard(),
        callPlatformMaintenance({ action: "diagnostics" }),
        getAdminAuthHealth(),
        getWhatsappStatus(),
        getDeployInfo(),
      ]);

    const dashboardData = dashboardResult.status === "fulfilled" ? dashboardResult.value?.data : null;
    const maintenanceData =
      maintenanceResult.status === "fulfilled" ? maintenanceResult.value?.barbershops || [] : [];
    const archivedCount = maintenanceData.filter((shop) => shop.archived_at).length;
    const activeCount = maintenanceData.filter((shop) => !shop.archived_at).length;
    const rpcOk =
      adminResult.status === "fulfilled" &&
      adminResult.value?.error == null &&
      adminResult.value?.data === true &&
      dashboardResult.status === "fulfilled" &&
      dashboardResult.value?.error == null;
    const firstError = [
      adminResult,
      dashboardResult,
      maintenanceResult,
      authResult,
      whatsappResult,
      deployResult,
    ].find((item) => item.status === "rejected" || item.value?.error);

    if (firstError) {
      setLastError(
        firstError.status === "rejected"
          ? errorText(firstError.reason)
          : errorText(firstError.value?.error)
      );
    }

    setSystemHealth({
      loading: false,
      checkedAt: checkedAtText(),
      supabase: {
        ok: maintenanceResult.status === "fulfilled" || dashboardResult.status === "fulfilled",
        detail:
          maintenanceResult.status === "fulfilled"
            ? "Consulta segura com service role respondeu."
            : dashboardResult.status === "fulfilled"
            ? "RPC principal respondeu pela sessão atual."
            : errorText(maintenanceResult.reason || dashboardResult.reason),
      },
      rpc: {
        ok: rpcOk,
        detail: rpcOk
          ? "is_platform_admin e get_platform_dashboard responderam."
          : errorText(
              adminResult.reason ||
                dashboardResult.reason ||
                adminResult.value?.error ||
                dashboardResult.value?.error
            ),
      },
      auth:
        authResult.status === "fulfilled"
          ? authResult.value
          : { ok: false, error: errorText(authResult.reason) },
      whatsapp:
        whatsappResult.status === "fulfilled"
          ? whatsappResult.value
          : { ok: false, error: errorText(whatsappResult.reason), missing: [] },
      deploy:
        deployResult.status === "fulfilled"
          ? deployResult.value
          : { ok: false, error: errorText(deployResult.reason) },
      data: {
        total: maintenanceData.length || dashboardData?.stats?.total || shops.length || 0,
        active: activeCount || dashboardData?.stats?.active || shops.length || 0,
        archived: archivedCount || dashboardData?.stats?.archived || archivedShops.length || 0,
      },
    });
  }

  async function loadDashboard() {
    setLoading(true);
    try {
    const { data, error } = await withTimeout(getPlatformDashboard(), "O painel da plataforma");
    if (error) {
      rememberError("get_platform_dashboard", error);
      setMessage("Não foi possível puxar dados da nuvem: " + errorText(error));
      return;
    }
    setDashboard(data || { stats: {}, barbershops: [] });
    await loadCloudAudit().catch(() => null);
    } catch (error) {
      rememberError("Painel Plataforma", error);
      setMessage("Não foi possível puxar dados da nuvem: " + errorText(error));
      setDashboard({ stats: {}, barbershops: [] });
      await loadCloudAudit({ allowDashboardFallback: true }).catch(() => null);
    } finally {
    setLoading(false);
    }
  }

  async function callPlatformMaintenance(payload) {
    return callPlatformMaintenanceRequest(payload);
  }

  async function loadCloudAudit(options = {}) {
    const result = await callPlatformMaintenance({ action: "diagnostics" });
    const nextAudit = { barbershops: result.barbershops || [] };
    setCloudAudit(nextAudit);

    if (options.allowDashboardFallback && result.barbershops?.length) {
      const active = result.barbershops.filter((shop) => !shop.archived_at).map(normalizeAuditShop);
      setDashboard((current) => ({
        ...(current || {}),
        barbershops: active,
        stats: {
          ...(current?.stats || {}),
          total: active.length,
          archived: result.barbershops.filter((shop) => shop.archived_at).length,
        },
      }));
    }

    return nextAudit;
  }

  async function restoreArchivedShop(shop) {
    if (!shop?.id && !shop?.slug) return;

    setSaving("restore-" + (shop.id || shop.slug));
    setMessage("");

    try {
      const result = await callPlatformMaintenance({
        action: "restore",
        id: shop.id,
        slug: shop.slug,
      });

      setCloudAudit({ barbershops: result.barbershops || [] });
      setMessage(`Barbearia ${shop.name || shop.slug} restaurada. Agora ela volta para a lista principal.`);
      await loadDashboard();
    } catch (error) {
      rememberError("Restaurar barbearia arquivada", error);
      setMessage("Não foi possível restaurar a barbearia: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function login() {
    const { error } = await loginWithGoogleRedirect(`${window.location.origin}/plataforma?platform=1`);
    if (error) setMessage(errorText(error));
  }

  async function loginWithPassword() {
    setSaving("platform-login");
    setMessage("");

    try {
      const { error } = await loginWithEmailPassword(platformLogin.email, platformLogin.password);

      if (error) throw error;
    } catch (error) {
      rememberError("Login Plataforma", error);
      setMessage("Não foi possível entrar com e-mail e senha: " + errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function logout() {
    await logoutAuth();
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
      if (field === "plan") next.plan_price = planPriceFor(value);
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
      rememberError("Buscar CEP da nova barbearia", error);
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
      rememberError("Buscar CEP da barbearia selecionada", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function syncOwnerAuthUser({ id, slug, email, password, role = "owner" }) {
    if (!password) return { skipped: true };

    return syncAdminAuthUser({
      barbershopId: id,
      barbershopSlug: slug,
      email,
      password,
      role,
      active: true,
    });
  }

  async function createShop(event) {
    event.preventDefault();
    setMessage("");

    const ownerPassword = String(newShop.owner_password || "").trim();

    if (ownerPassword.length < 6) {
      setMessage("Informe uma senha inicial do dono com pelo menos 6 caracteres.");
      return;
    }

    setSaving("create");

    try {
      const { data, error } = await createBarbershopFull({
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

      const priceSync = await updatePlatformBarbershop({
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

      if (priceSync.error) throw priceSync.error;

      const createdSlug = data?.slug || newShop.slug || makeSlug(newShop.name);
      const createdPanelLink = data?.link_painel || `/painel/${createdSlug}`;

      try {
        await syncOwnerAuthUser({
          id: data?.barbershop_id,
          slug: createdSlug,
          email: newShop.owner_email,
          password: ownerPassword,
          role: "owner",
        });
      } catch (authError) {
        setMessage(
          `Barbearia cadastrada, mas o login do dono não foi criado. ${ownerLoginErrorText(
            authError
          )} Corrija a senha na edição da barbearia antes de entregar o painel.`
        );
        await loadDashboard();
        return;
      }

      setMessage(
        `Barbearia cadastrada. Login do dono criado. Cliente: ${data?.link_cliente || ""} Painel: ${createdPanelLink} Abrindo o painel da barbearia...`
      );
      setNewShop(emptyForm());
      setSlugTouched(false);
      await loadDashboard();
      window.location.assign(createdPanelLink);
    } catch (error) {
      rememberError("Cadastrar barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function saveShop(event) {
    event.preventDefault();
    if (!selectedShop) return;
    setMessage("");

    const ownerPassword = String(selectedShop.owner_password || "").trim();

    if (ownerPassword && ownerPassword.length < 6) {
      setMessage("A nova senha do dono precisa ter pelo menos 6 caracteres.");
      return;
    }

    setSaving("shop");

    try {
      const { error } = await updatePlatformBarbershop({
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

      if (selectedShop.monthly_status === "archived") {
        const archiveResult = await archivePlatformBarbershop(selectedShop.slug);
        if (archiveResult.error) throw archiveResult.error;
      }

      let loginMessage = "";

      if (ownerPassword) {
        try {
          await syncOwnerAuthUser({
            id: selectedShop.id,
            slug: selectedShop.slug,
            email: selectedShop.owner_email,
            password: ownerPassword,
            role: "owner",
          });
          updateSelected("owner_password", "");
          loginMessage = " Login do dono atualizado.";
        } catch (authError) {
          setMessage(
            `Dados da barbearia salvos, mas o login do dono não foi atualizado. ${ownerLoginErrorText(
              authError
            )}`
          );
          await loadDashboard();
          return;
        }
      }

      setMessage(`Barbearia atualizada com sucesso.${loginMessage}`);
      await loadDashboard();
    } catch (error) {
      rememberError("Salvar barbearia", error);
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
      const { error } = await archivePlatformBarbershop(shop.slug);
      if (error) throw error;
      if (selectedShop?.slug === shop.slug) setSelectedShop(null);
      setMessage("Barbearia removida da lista do painel. Ela continua cadastrada no banco de dados.");
      await loadDashboard();
    } catch (error) {
      rememberError("Arquivar barbearia", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function purgeArchivedShops() {
    const archivedCount = archivedShops.length || Number(dashboard.stats?.archived || 0);
    if (!archivedCount) {
      setMessage("Não há barbearias arquivadas para limpar.");
      return;
    }

    const confirmation = window.prompt(
      `Esta ação apaga definitivamente ${archivedCount} barbearia(s) arquivada(s) e seus dados vinculados. Digite LIMPAR para confirmar.`
    );

    if (confirmation !== "LIMPAR") {
      setMessage("Limpeza definitiva cancelada.");
      return;
    }

    setSaving("purge-archived");
    setMessage("");

    try {
      const { data, error } = await purgeArchivedBarbershops();
      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      setSelectedShop(null);
      setMessage(
        `Limpeza concluída. ${result?.deleted_barbershops || 0} barbearia(s), ${result?.deleted_appointments || 0} agendamento(s) e ${result?.deleted_clients || 0} cliente(s) foram removidos.`
      );
      await loadDashboard();
    } catch (error) {
      rememberError("Limpar arquivadas", error);
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

      const { error } = await savePlatformFeatureFlags({
        target_slug: selectedShop.slug,
        features_input: features,
      });

      if (error) throw error;

      setMessage("Funções atualizadas com sucesso.");
      await loadDashboard();
    } catch (error) {
      rememberError("Salvar funções", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  async function sendBillingReminders() {
    setSaving("reminders");
    setMessage("");

    try {
      const { data, error } = await getPlatformBillingReminders();
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
          await sendWhatsappMessage({ to: item.whatsapp, message: item.message });
          await markBillingReminderSent(item.slug);
          sent += 1;
        } catch (_err) {
          failed += 1;
        }
      }

      setMessage(`Avisos de vencimento: ${sent} enviado(s), ${failed} com falha.`);
      await loadDashboard();
    } catch (error) {
      rememberError("Avisos de vencimento", error);
      setMessage(errorText(error));
    } finally {
      setSaving("");
    }
  }

  function updateSelected(field, value) {
    setSelectedShop((current) => {
      const next = { ...current, [field]: value };
      if (field === "plan") next.plan_price = planPriceFor(value);
      return next;
    });
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
            <p>Entre como desenvolvedor para cadastrar barbearias, liberar funções e administrar planos.</p>
            {message ? <p className="platformNotice">{message}</p> : null}
          </div>
          <div className="platformLoginBox">
            <label>E-mail</label>
            <input
              type="email"
              value={platformLogin.email}
              onChange={(event) => setPlatformLogin({ ...platformLogin, email: event.target.value })}
              placeholder="appagenda.pro@gmail.com"
            />
            <label>Senha</label>
            <input
              type="password"
              value={platformLogin.password}
              onChange={(event) => setPlatformLogin({ ...platformLogin, password: event.target.value })}
              placeholder="Digite sua senha"
            />
            <button
              type="button"
              className="platformPrimary platformLoginButton"
              disabled={saving === "platform-login"}
              onClick={loginWithPassword}
            >
              {saving === "platform-login" ? "Entrando..." : "Entrar com e-mail e senha"}
            </button>
            <button type="button" className="platformSecondary platformLoginButton" onClick={login}>
              Entrar com Google
            </button>
          </div>
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
          <button
            type="button"
            className="platformSecondary"
            onClick={async () => {
              await loadDashboard();
              await checkSystemHealth();
            }}
          >
            Atualizar
          </button>
          <button type="button" className="platformSecondary" disabled={saving === "reminders"} onClick={sendBillingReminders}>{saving === "reminders" ? "Enviando..." : "Enviar avisos de vencimento"}</button>
          <button type="button" className="platformDangerGhost" disabled={saving === "purge-archived" || !(archivedShops.length || Number(dashboard.stats?.archived || 0))} onClick={purgeArchivedShops}>{saving === "purge-archived" ? "Limpando..." : `Limpar arquivadas (${archivedShops.length || dashboard.stats?.archived || 0})`}</button>
          <button type="button" className="platformSecondary" onClick={logout}>Sair</button>
        </div>
      </header>

      {message ? <section className="platformCard platformNoticeCard">{message}</section> : null}

      <section className="platformStats platformStatsPro">
        <StatCard label="Faturamento mensal previsto" value={money(dashboard.stats?.monthly_revenue || 0)} hint="Ativos + teste" />
        <StatCard label="Em atraso" value={money(dashboard.stats?.overdue_revenue || 0)} hint={`${dashboard.stats?.overdue || 0} barbearia(s)`} />
        <StatCard label="Ativas" value={dashboard.stats?.active || shops.filter((shop) => shop.monthly_status === "active").length || 0} hint={`${dashboard.stats?.trial || shops.filter((shop) => shop.monthly_status === "trial").length || 0} em teste`} />
        <StatCard label="Bloqueadas" value={dashboard.stats?.blocked || shops.filter((shop) => shop.monthly_status === "blocked").length || 0} hint={`Próximo: ${dateText(dashboard.stats?.next_billing)}`} />
        <StatCard label="Canceladas" value={dashboard.stats?.cancelled || shops.filter((shop) => shop.monthly_status === "cancelled").length || 0} hint="contratos encerrados" />
        <StatCard label="Arquivadas" value={dashboard.stats?.archived || 0} hint="fora da lista principal" />
      </section>

      <section className="platformTabs">
        <button
          type="button"
          className={platformTab === "barbershops" ? "active" : ""}
          onClick={() => setPlatformTab("barbershops")}
        >
          Barbearias
        </button>
        <button
          type="button"
          className={platformTab === "diagnostics" ? "active" : ""}
          onClick={() => setPlatformTab("diagnostics")}
        >
          Diagnóstico
        </button>
      </section>

      {platformTab === "diagnostics" && (
      <section className="platformCard platformHealthCard platformDiagnosticsCard">
        <div className="platformTitle">
          <div>
            <span>Diagnóstico</span>
            <h2>Sistema</h2>
          </div>
          <button
            type="button"
            className="platformSecondary"
            disabled={systemHealth.loading}
            onClick={checkSystemHealth}
          >
            {systemHealth.loading ? "Verificando..." : "Verificar sistema"}
          </button>
        </div>

        <div className="platformDiagnosticActions">
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar RPCs
          </button>
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar Auth
          </button>
          <button type="button" className="platformSecondary" disabled={systemHealth.loading} onClick={checkSystemHealth}>
            Testar WhatsApp
          </button>
        </div>

        <div className="platformHealthGrid platformDiagnosticGrid">
          <HealthItem
            label="Supabase conectado"
            tone={systemHealth.supabase?.ok ? "ready" : "danger"}
            status={systemHealth.supabase?.ok ? "Conectado" : "Falha"}
            detail={systemHealth.supabase?.detail || "Aguardando verificação da conexão com a nuvem."}
          />
          <HealthItem
            label="RPCs principais"
            tone={systemHealth.rpc?.ok ? "ready" : "danger"}
            status={systemHealth.rpc?.ok ? "Respondendo" : "Atenção"}
            detail={systemHealth.rpc?.detail || "Testa is_platform_admin e get_platform_dashboard."}
          />
          <HealthItem
            label="Login e senha"
            tone={systemHealth.auth?.serviceRoleConfigured ? "ready" : "danger"}
            status={systemHealth.auth?.serviceRoleConfigured ? "Pronto" : "Atenção"}
            detail={
              systemHealth.auth?.serviceRoleConfigured
                ? "SUPABASE_SERVICE_ROLE_KEY ativa para criar logins de donos."
                : systemHealth.auth?.error || "Falta SUPABASE_SERVICE_ROLE_KEY na Vercel."
            }
          />
          <HealthItem
            label="WhatsApp automático"
            tone={systemHealth.whatsapp?.ready ? "ready" : "warning"}
            status={systemHealth.whatsapp?.ready ? "Pronto" : "Pendente"}
            detail={
              systemHealth.whatsapp?.ready
                ? `${systemHealth.whatsapp.providerLabel || "WhatsApp Cloud API"} configurado.`
                : (systemHealth.whatsapp?.missing || []).length
                ? `Falta configurar: ${(systemHealth.whatsapp.missing || []).join(", ")}.`
                : systemHealth.whatsapp?.error || "Aguardando verificação das chaves."
            }
          />
          <HealthItem
            label="Último deploy"
            tone={systemHealth.deploy?.ok ? "ready" : "warning"}
            status={shortCommit(systemHealth.deploy?.commitSha)}
            detail={
              systemHealth.deploy?.ok
                ? `${systemHealth.deploy.environment || "produção"} · ${systemHealth.deploy.branch || "branch não informada"}`
                : systemHealth.deploy?.error || "Endpoint de deploy ainda não verificado."
            }
          />
          <HealthItem
            label="Dados da plataforma"
            tone={systemHealth.data?.total || shops.length ? "ready" : "warning"}
            status={`${systemHealth.data?.total ?? shops.length ?? 0} total`}
            detail={`${systemHealth.data?.active ?? shops.length ?? 0} ativa(s). ${systemHealth.data?.archived ?? archivedShops.length ?? 0} arquivada(s).`}
          />
          <HealthItem
            label="Último erro"
            tone={lastError ? "danger" : "ready"}
            status={lastError ? "Registrado" : "Sem erro recente"}
            detail={lastError || "Nenhum erro capturado nesta sessão do painel."}
          />
        </div>

        <div className="platformPermissionMatrix">
          <div className="platformTitle compactTitle">
            <div>
              <span>Permissões</span>
              <h3>Teste prático por cargo</h3>
            </div>
          </div>

          {permissionScenarioMatrix().map((scenario) => (
            <article className="platformPermissionCard" key={scenario.role}>
              <div>
                <strong>{scenario.label}</strong>
                <small>{scenario.visibleTabs.join(", ")}</small>
              </div>
              <span className={scenario.canManageBilling ? "readyPill" : "lockedPill"}>
                {scenario.canManageBilling ? "Plano liberado" : "Sem plano"}
              </span>
              <span className={scenario.canManageFeatures ? "readyPill" : "lockedPill"}>
                {scenario.canManageFeatures ? "Melhorias liberadas" : "Sem melhorias"}
              </span>
              <span className={scenario.canManageSensitiveAccount ? "readyPill" : "lockedPill"}>
                {scenario.canManageSensitiveAccount ? "Conta sensível" : "Conta limitada"}
              </span>
            </article>
          ))}
        </div>

        <p className="platformHealthFooter">
          {systemHealth.checkedAt
            ? `Última verificação: ${systemHealth.checkedAt}.`
            : "Clique em verificar para atualizar o diagnóstico."}
        </p>
      </section>
      )}

      {platformTab === "barbershops" && (
      <>

      <section className="platformFilters">
        <button type="button" className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas</button>
        <button type="button" className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Ativas</button>
        <button type="button" className={filter === "trial" ? "active" : ""} onClick={() => setFilter("trial")}>Teste</button>
        <button type="button" className={filter === "pending" ? "active" : ""} onClick={() => setFilter("pending")}>Pendentes</button>
        <button type="button" className={filter === "overdue" ? "active" : ""} onClick={() => setFilter("overdue")}>Atrasadas</button>
        <button type="button" className={filter === "blocked" ? "active" : ""} onClick={() => setFilter("blocked")}>Bloqueadas</button>
        <button type="button" className={filter === "cancelled" ? "active" : ""} onClick={() => setFilter("cancelled")}>Canceladas</button>
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
            <label>Senha inicial do dono</label>
            <input value={newShop.owner_password || ""} onChange={(event) => updateNewShop("owner_password", event.target.value)} type="password" autoComplete="new-password" minLength={6} placeholder="mínimo 6 caracteres" required />
            <div className="platformTwoCols">
              <span><label>Plano</label><select value={newShop.plan} onChange={(event) => updateNewShop("plan", event.target.value)}>{planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></span>
              <span><label>Status</label><select value={newShop.monthly_status} onChange={(event) => updateNewShop("monthly_status", event.target.value)}>{creationStatusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
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
                  <small>
                    {shop.owner_email || "Sem e-mail"}
                    {typeof shop.admin_count === "number" ? ` · ${shop.admin_count} acesso(s)` : ""}
                    {typeof shop.service_count === "number" ? ` · ${shop.service_count} serviço(s)` : ""}
                  </small>
                  <div className="platformShopMeta">
                    <b>{shop.plan_label || planLabel(shop.plan)}</b>
                    <span>{money(shop.plan_price || 0)}/mês</span>
                    <span>Vence: {dateText(shop.next_billing_date)}</span>
                    {typeof shop.days_to_billing === "number" ? <span>{shop.days_to_billing} dia(s)</span> : null}
                  </div>
                </div>
                <div className="platformShopActions">
                  {statusBadge(shop.monthly_status, shop.status_label)}
                  <button type="button" onClick={() => setSelectedShop(JSON.parse(JSON.stringify(shop)))}>Editar</button>
                  <a href={`/painel/${shop.slug}`} target="_blank" rel="noreferrer">Entrar no painel</a>
                  <a href={`/${shop.slug}`} target="_blank" rel="noreferrer">Link cliente</a>
                  <button type="button" className="platformDanger" disabled={saving === "hide-" + shop.slug} onClick={() => hideShopFromPlatform(shop)}>{saving === "hide-" + shop.slug ? "Removendo..." : "Remover da lista"}</button>
                </div>
              </article>
            )) : <p className="platformMuted">Nenhuma barbearia encontrada nesse filtro.</p>}
          </div>
          {archivedShops.length ? (
            <div className="platformArchiveBox">
              <div className="platformTitle">
                <div>
                  <span>Diagnóstico da nuvem</span>
                  <h3>Barbearias arquivadas</h3>
                </div>
                <button
                  type="button"
                  className="platformDangerGhost"
                  disabled={saving === "purge-archived"}
                  onClick={purgeArchivedShops}
                >
                  {saving === "purge-archived" ? "Limpando..." : "Apagar arquivadas"}
                </button>
              </div>
              <p className="platformMuted">
                Essas barbearias existem no banco, mas ficam escondidas da lista principal. Restaure para voltar a testar e editar.
              </p>
              <div className="platformShopList">
                {archivedShops.map((shop) => (
                  <article className="platformShop platformShopArchived" key={shop.id || shop.slug}>
                    <div>
                      <strong>{shop.name || "Sem nome"}</strong>
                      <span>{shop.slug}</span>
                      <small>{shop.owner_email || "Sem e-mail"} · {shop.admin_count || 0} acesso(s) · {shop.service_count || 0} serviço(s)</small>
                    </div>
                    <div className="platformShopActions">
                      <b className="statusBlocked">Arquivada</b>
                      <button
                        type="button"
                        disabled={saving === "restore-" + (shop.id || shop.slug)}
                        onClick={() => restoreArchivedShop(shop)}
                      >
                        {saving === "restore-" + (shop.id || shop.slug) ? "Restaurando..." : "Restaurar"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="platformCard" id="platformEditor">
        {!selectedShop ? <p className="platformMuted">Selecione uma barbearia para editar plano, status e funções.</p> : (
          <>
            <div className="platformTitle"><div><span>Edição</span><h2>{selectedShop.name}</h2></div><button type="button" className="platformSecondary" onClick={() => setSelectedShop(null)}>Fechar</button></div>
            <div className="platformEditorHero">
              <div><span>Plano</span><strong>{planLabel(selectedShop.plan)}</strong><small>{money(selectedShop.plan_price || 0)}/mês</small></div>
              <div><span>Status</span><strong>{statusLabel(selectedShop.monthly_status)}</strong><small>{typeof selectedShop.days_to_billing === "number" ? `${selectedShop.days_to_billing} dia(s)` : "sem alerta"}</small></div>
              <div><span>Vencimento</span><strong>{dateText(selectedShop.next_billing_date)}</strong><small>renovação da assinatura</small></div>
              <div><span>Recursos</span><strong>{Object.values(selectedShop.features || {}).filter((item) => item?.released).length}</strong><small>liberados no plano</small></div>
            </div>
            <div className="platformQuickActions">
              <button type="button" onClick={() => updateSelected("monthly_status", "active")}>Marcar ativo</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "trial")}>Teste 30 dias</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "pending")}>Pendente</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "overdue")}>Marcar atraso</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "blocked")}>Bloquear</button>
              <button type="button" onClick={() => updateSelected("monthly_status", "cancelled")}>Cancelar</button>
              <button type="button" onClick={() => updateSelected("next_billing_date", futureDateText(30))}>Renovar +30 dias</button>
            </div>
            <form className="platformForm" onSubmit={saveShop}>
              <div className="platformEditorSection">
                <h3>Dados principais</h3>
              <label>Nome</label><input value={selectedShop.name || ""} onChange={(event) => updateSelected("name", event.target.value)} />
              <label>WhatsApp</label><input value={selectedShop.whatsapp || ""} onChange={(event) => updateSelected("whatsapp", event.target.value)} />
              <label>E-mail do dono</label><input value={selectedShop.owner_email || ""} onChange={(event) => updateSelected("owner_email", event.target.value)} type="email" />
              <label>Nova senha do dono</label><input value={selectedShop.owner_password || ""} onChange={(event) => updateSelected("owner_password", event.target.value)} type="password" autoComplete="new-password" minLength={6} placeholder="preencha apenas se quiser alterar" />
              </div>
              <div className="platformEditorSection">
                <h3>Assinatura</h3>
              <div className="platformTwoCols">
                <span><label>Plano</label><select value={selectedShop.plan || "professional"} onChange={(event) => updateSelected("plan", event.target.value)}>{planOptions.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></span>
                <span><label>Status</label><select value={selectedShop.monthly_status || "active"} onChange={(event) => updateSelected("monthly_status", event.target.value)}><option value="pending">Pendente</option>{statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></span>
              </div>
              <div className="platformTwoCols">
                <span><label>Vencimento</label><input value={selectedShop.next_billing_date || ""} onChange={(event) => updateSelected("next_billing_date", event.target.value)} type="date" /></span>
                <span><label>Valor mensal</label><input value={selectedShop.plan_price ?? ""} onChange={(event) => updateSelected("plan_price", event.target.value)} type="number" min="0" step="1" placeholder="89" /></span>
              </div>
              </div>
              <div className="platformEditorSection">
                <h3>Endereço e identidade</h3>
              <div className="platformTwoCols">
                <span><label>CEP</label><input value={selectedShop.cep || ""} onChange={(event) => updateSelected("cep", event.target.value)} placeholder="00000000" inputMode="numeric" /></span>
                <span><label>Número do comércio</label><input value={selectedShop.address_number || ""} onChange={(event) => updateSelected("address_number", event.target.value)} placeholder="123" /></span>
              </div>
              <button type="button" className="platformSecondary platformCepButton" disabled={saving === "cep-shop"} onClick={fillSelectedShopAddressByCep}>{saving === "cep-shop" ? "Buscando CEP..." : "Puxar endereço pelo CEP"}</button>
              <label>Endereço</label><input value={selectedShop.address || ""} onChange={(event) => updateSelected("address", event.target.value)} />
              <label>Chave PIX</label><input value={selectedShop.pix_key || ""} onChange={(event) => updateSelected("pix_key", event.target.value)} />
              <label>Cor principal</label><input value={selectedShop.theme_color || "#22c55e"} onChange={(event) => updateSelected("theme_color", event.target.value)} type="color" />
              </div>
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
      </>
      )}
    </main>
  );
}
