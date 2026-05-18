import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

function cleanEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function errorMessage(error) {
  return error?.message || error?.error_description || String(error || "Erro desconhecido.");
}

async function assertPlatformAdmin(adminClient, request) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return { ok: false, status: 401, error: "Sessao da plataforma nao encontrada." };
  }

  const { data: requesterData, error: requesterError } = await adminClient.auth.getUser(token);
  const requesterEmail = cleanEmail(requesterData?.user?.email);

  if (requesterError || !requesterEmail) {
    return { ok: false, status: 401, error: "Sessao invalida ou expirada." };
  }

  const { data: platformAdmin, error: platformError } = await adminClient
    .from("platform_admins")
    .select("email, active")
    .eq("email", requesterEmail)
    .eq("active", true)
    .maybeSingle();

  if (platformError || !platformAdmin) {
    return { ok: false, status: 403, error: "Acesso restrito ao desenvolvedor da plataforma." };
  }

  return { ok: true, email: requesterEmail };
}

async function listDiagnostics(adminClient) {
  const { data: shops, error: shopsError } = await adminClient
    .from("barbershops")
    .select(
      "id, slug, name, whatsapp, address, pix_key, theme_color, archived_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (shopsError) throw shopsError;

  const ids = (shops || []).map((shop) => shop.id);

  const [accountsResult, adminsResult, servicesResult, professionalsResult] = await Promise.all([
    ids.length
      ? adminClient
          .from("barbershop_accounts")
          .select("barbershop_id, owner_email, plan, monthly_status, next_billing_date, plan_price")
          .in("barbershop_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? adminClient
          .from("barbershop_admins")
          .select("barbershop_id, email, role, active")
          .in("barbershop_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? adminClient
          .from("services")
          .select("barbershop_id, id, deleted_at")
          .in("barbershop_id", ids)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? adminClient
          .from("professionals")
          .select("barbershop_id, id")
          .in("barbershop_id", ids)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError =
    accountsResult.error || adminsResult.error || servicesResult.error || professionalsResult.error;
  if (firstError) throw firstError;

  const accountsByShop = new Map((accountsResult.data || []).map((item) => [item.barbershop_id, item]));

  return (shops || []).map((shop) => {
    const account = accountsByShop.get(shop.id) || {};
    const admins = (adminsResult.data || []).filter((item) => item.barbershop_id === shop.id);
    const services = (servicesResult.data || []).filter(
      (item) => item.barbershop_id === shop.id && !item.deleted_at
    );
    const professionals = (professionalsResult.data || []).filter(
      (item) => item.barbershop_id === shop.id
    );

    return {
      ...shop,
      owner_email: account.owner_email || "",
      plan: account.plan || "professional",
      monthly_status: account.monthly_status || "trial",
      next_billing_date: account.next_billing_date || null,
      plan_price: account.plan_price || 0,
      admin_count: admins.length,
      active_admin_count: admins.filter((item) => item.active !== false).length,
      service_count: services.length,
      professional_count: professionals.length,
    };
  });
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "Metodo nao permitido." });
  }

  if (!serviceRoleKey) {
    return response.status(501).json({
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY nao esta configurada no Vercel.",
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const auth = await assertPlatformAdmin(adminClient, request);
  if (!auth.ok) {
    return response.status(auth.status).json({ ok: false, error: auth.error });
  }

  let payload = {};

  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    payload = {};
  }

  const action = String(payload.action || "diagnostics");

  try {
    if (action === "diagnostics") {
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, barbershops });
    }

    if (action === "restore") {
      const id = String(payload.id || "").trim();
      const slug = String(payload.slug || "").trim().toLowerCase();

      if (!id && !slug) {
        return response.status(400).json({ ok: false, error: "Informe a barbearia para restaurar." });
      }

      let query = adminClient.from("barbershops").update({ archived_at: null });
      query = id ? query.eq("id", id) : query.eq("slug", slug);
      const { error } = await query;

      if (error) throw error;

      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, barbershops });
    }

    return response.status(400).json({ ok: false, error: "Acao nao reconhecida." });
  } catch (error) {
    return response.status(400).json({ ok: false, error: errorMessage(error) });
  }
}
