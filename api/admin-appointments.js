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

async function assertBarbershopAdmin(adminClient, request, slug) {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return { ok: false, status: 401, error: "Sessao do painel nao encontrada." };
  }

  const { data: requesterData, error: requesterError } = await adminClient.auth.getUser(token);
  const requesterEmail = cleanEmail(requesterData?.user?.email);

  if (requesterError || !requesterEmail) {
    return { ok: false, status: 401, error: "Sessao invalida ou expirada." };
  }

  const { data: shop, error: shopError } = await adminClient
    .from("barbershops")
    .select("id, slug, archived_at")
    .eq("slug", String(slug || "").trim().toLowerCase())
    .maybeSingle();

  if (shopError || !shop || shop.archived_at) {
    return { ok: false, status: 404, error: "Barbearia nao encontrada ou arquivada." };
  }

  const requesterMetadata = requesterData?.user?.app_metadata || {};
  const metadataAllowsPlatform =
    requesterMetadata.platform_admin === true ||
    requesterMetadata.role === "platform" ||
    requesterMetadata.role === "developer";

  const { data: platformAdmin, error: platformError } = await adminClient
    .from("platform_admins")
    .select("email, active")
    .eq("email", requesterEmail)
    .eq("active", true)
    .maybeSingle();

  const { data: barbershopAdmin, error: adminError } = await adminClient
    .from("barbershop_admins")
    .select("email, role, active")
    .eq("barbershop_id", shop.id)
    .eq("email", requesterEmail)
    .eq("active", true)
    .maybeSingle();

  if (platformError || adminError || (!platformAdmin && !barbershopAdmin && !metadataAllowsPlatform)) {
    return { ok: false, status: 403, error: "Acesso restrito ao painel desta barbearia." };
  }

  return { ok: true, shop };
}

async function listAppointments(adminClient, barbershopId) {
  const { data, error } = await adminClient
    .from("appointments")
    .select(
      "id, client_name, whatsapp, professional_id, appointment_date, appointment_time, duration, total, payment_method, paid, status, reschedule_requested, public_token, customer_note, created_at, updated_at"
    )
    .eq("barbershop_id", barbershopId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (!error) return data || [];

  const fallback = await adminClient
    .from("appointments")
    .select(
      "id, client_name, whatsapp, professional_id, appointment_date, appointment_time, duration, total, payment_method, paid, status, reschedule_requested, created_at, updated_at"
    )
    .eq("barbershop_id", barbershopId)
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (fallback.error) throw fallback.error;

  return (fallback.data || []).map((item) => ({
    ...item,
    customer_note: "",
    public_token: "",
  }));
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

  let payload = {};
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    payload = {};
  }

  const targetSlug = String(payload.target_slug || payload.slug || "").trim().toLowerCase();
  if (!targetSlug) {
    return response.status(400).json({ ok: false, error: "Informe o slug da barbearia." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const auth = await assertBarbershopAdmin(adminClient, request, targetSlug);
  if (!auth.ok) {
    return response.status(auth.status).json({ ok: false, error: auth.error });
  }

  try {
    const appointments = await listAppointments(adminClient, auth.shop.id);
    return response.status(200).json({ ok: true, appointments });
  } catch (error) {
    return response.status(400).json({ ok: false, error: errorMessage(error) });
  }
}
