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

const protectedPlatformEmails = ["dyoser2@gmail.com", "appagenda.pro@gmail.com"];
const allowedAccessEmailDomains = ["gmail.com", "agendapro.com"];

function cleanEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function errorMessage(error) {
  return error?.message || error?.error_description || String(error || "Erro desconhecido.");
}

function isAllowedAccessEmailDomain(value = "") {
  const domain = cleanEmail(value).split("@").pop() || "";
  return allowedAccessEmailDomains.includes(domain);
}

async function findUserByEmail(adminClient, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data?.users || [];
    const found = users.find((user) => cleanEmail(user.email) === email);
    if (found) return found;
    if (users.length < 1000) return null;
  }

  return null;
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

  if (platformError || (!platformAdmin && !metadataAllowsPlatform)) {
    return { ok: false, status: 403, error: "Acesso restrito ao desenvolvedor da plataforma." };
  }

  return { ok: true, email: requesterEmail };
}

async function syncBarbershopDeveloperAccess(adminClient, email, active) {
  const { data: shops, error: shopsError } = await adminClient
    .from("barbershops")
    .select("id")
    .is("archived_at", null);

  if (shopsError) throw shopsError;

  if (!shops?.length) return;

  if (active) {
    const rows = shops.map((shop) => ({
      barbershop_id: shop.id,
      email,
      role: "platform",
      active: true,
    }));

    const { error } = await adminClient
      .from("barbershop_admins")
      .upsert(rows, { onConflict: "barbershop_id,email" });

    if (error) throw error;
    return;
  }

  const { error } = await adminClient
    .from("barbershop_admins")
    .update({ active: false })
    .eq("email", email)
    .eq("role", "platform");

  if (error) throw error;
}

async function listPlatformAccesses(adminClient) {
  const { data, error } = await adminClient
    .from("platform_admins")
    .select("email, active, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function upsertAuthUser(adminClient, email, password, active) {
  if (!password) return null;

  const metadata = {
    role: "platform",
    platform_admin: true,
  };

  const { data: createdData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: metadata,
  });

  if (!createError) return createdData?.user || null;

  const existingUser = await findUserByEmail(adminClient, email);
  if (!existingUser) throw createError;

  const { data: updatedData, error: updateError } = await adminClient.auth.admin.updateUserById(
    existingUser.id,
    {
      password,
      email_confirm: true,
      app_metadata: {
        ...(existingUser.app_metadata || {}),
        ...metadata,
      },
    }
  );

  if (updateError) throw updateError;

  return updatedData?.user || existingUser;
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    return response.status(200).json({
      ok: true,
      endpoint: "platform-auth-user",
      serviceRoleConfigured: Boolean(serviceRoleKey),
    });
  }

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

  const action = String(payload.action || "upsert");

  try {
    if (action === "list") {
      const accesses = await listPlatformAccesses(adminClient);
      return response.status(200).json({ ok: true, accesses });
    }

    const email = cleanEmail(payload.email);
    const password = String(payload.password || "");
    const active = payload.active !== false;

    if (!email || !email.includes("@")) {
      return response.status(400).json({ ok: false, error: "Informe um e-mail valido." });
    }

    if (!isAllowedAccessEmailDomain(email)) {
      return response.status(400).json({
        ok: false,
        error: "Use um e-mail @gmail.com ou @agendapro.com cadastrado pela plataforma.",
      });
    }

    if (!active && protectedPlatformEmails.includes(email)) {
      return response.status(403).json({
        ok: false,
        error: "Este acesso principal nao pode ser desativado por seguranca.",
      });
    }

    if (active && password.length < 6) {
      return response.status(400).json({
        ok: false,
        error: "A senha precisa ter pelo menos 6 caracteres.",
      });
    }

    const authUser = await upsertAuthUser(adminClient, email, password, active);

    const { error: upsertError } = await adminClient.from("platform_admins").upsert(
      {
        email,
        active,
      },
      { onConflict: "email" }
    );

    if (upsertError) throw upsertError;

    await syncBarbershopDeveloperAccess(adminClient, email, active);

    const accesses = await listPlatformAccesses(adminClient);

    return response.status(200).json({
      ok: true,
      email,
      user_id: authUser?.id || null,
      accesses,
    });
  } catch (error) {
    return response.status(400).json({ ok: false, error: errorMessage(error) });
  }
}
