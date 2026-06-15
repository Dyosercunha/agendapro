import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

const availableStatuses = new Set(["active", "trial"]);
const unavailableStatusLabels = {
  archived: "arquivada",
  blocked: "bloqueada",
  cancelled: "cancelada",
  canceled: "cancelada",
  disabled: "desativada",
  inactive: "desativada",
  overdue: "atrasada",
};

function normalizeText(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function publicShop(shop, account = {}) {
  const monthlyStatus = String(account.monthly_status || "trial").toLowerCase();

  return {
    name: shop.name || shop.slug,
    slug: shop.slug,
    status: shop.archived_at ? "archived" : monthlyStatus,
  };
}

function isAvailable(shop) {
  return !shop.status || availableStatuses.has(String(shop.status).toLowerCase());
}

function statusLabel(status = "") {
  return unavailableStatusLabels[String(status || "").toLowerCase()] || "indisponivel";
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ ok: false, error: "Metodo nao permitido." });
  }

  if (!supabaseUrl || !supabaseKey) {
    return response.status(200).json({
      ok: true,
      shops: [],
      match: null,
      unavailable: null,
      source: "fallback",
    });
  }

  const query = normalizeText(request.query?.query || request.query?.q || "");
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const { data: shops, error: shopsError } = await supabase
      .from("barbershops")
      .select("id, slug, name, archived_at, created_at")
      .order("name", { ascending: true });

    if (shopsError) throw shopsError;

    const shopIds = (shops || []).map((shop) => shop.id);
    const { data: accounts, error: accountsError } = shopIds.length
      ? await supabase
          .from("barbershop_accounts")
          .select("barbershop_id, monthly_status")
          .in("barbershop_id", shopIds)
      : { data: [], error: null };

    if (accountsError) throw accountsError;

    const accountsByShop = new Map((accounts || []).map((item) => [item.barbershop_id, item]));
    const mapped = (shops || []).map((shop) => publicShop(shop, accountsByShop.get(shop.id)));

    const exact = query
      ? mapped.find((shop) => normalizeText(shop.slug) === query || normalizeText(shop.name) === query)
      : null;

    const activeShops = mapped.filter(isAvailable);
    const filteredActive = activeShops
      .filter((shop) => {
        if (!query) return true;
        return normalizeText(shop.slug).includes(query) || normalizeText(shop.name).includes(query);
      })
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"))
      .slice(0, 10);

    const fallbackActive = activeShops
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"))
      .slice(0, 10);

    const unavailable = exact && !isAvailable(exact)
      ? {
          name: exact.name,
          slug: exact.slug,
          status: exact.status,
          label: statusLabel(exact.status),
        }
      : null;

    return response.status(200).json({
      ok: true,
      shops: filteredActive.length ? filteredActive : fallbackActive,
      match: exact && isAvailable(exact) ? exact : null,
      unavailable,
      source: "supabase",
    });
  } catch (error) {
    return response.status(200).json({
      ok: true,
      shops: [],
      match: null,
      unavailable: null,
      source: "fallback",
      error: error?.message || "Nao foi possivel carregar barbearias.",
    });
  }
}
