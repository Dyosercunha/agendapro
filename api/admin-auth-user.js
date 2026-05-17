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

function normalizeRole(value = "") {
  const role = String(value).trim().toLowerCase();

  if (["owner", "dono"].includes(role)) return "owner";
  if (["platform", "developer", "desenvolvedor", "plataforma"].includes(role)) return "platform";

  return "manager";
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

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false, error: "Método não permitido." });
  }

  if (!serviceRoleKey) {
    return response.status(501).json({
      ok: false,
      error:
        "SUPABASE_SERVICE_ROLE_KEY ainda não está configurada no Vercel. Sem essa chave, a barbearia salva, mas o login e a senha do dono não são criados no Supabase Auth.",
    });
  }

  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  if (!token) {
    return response.status(401).json({ ok: false, error: "Sessão da plataforma não encontrada." });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: requesterData, error: requesterError } = await adminClient.auth.getUser(token);
  const requesterEmail = cleanEmail(requesterData?.user?.email);

  if (requesterError || !requesterEmail) {
    return response.status(401).json({ ok: false, error: "Sessão inválida ou expirada." });
  }

  let payload = {};

  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  } catch {
    payload = {};
  }
  const email = cleanEmail(payload.email);
  const password = String(payload.password || "");
  const barbershopSlug = String(payload.barbershopSlug || payload.slug || "").trim();
  let role = normalizeRole(payload.role || "owner");
  const active = payload.active !== false;

  if (!email || !email.includes("@")) {
    return response.status(400).json({ ok: false, error: "Informe um e-mail válido." });
  }

  if (password.length < 6) {
    return response.status(400).json({ ok: false, error: "A senha precisa ter pelo menos 6 caracteres." });
  }

  if (!barbershopSlug) {
    return response.status(400).json({ ok: false, error: "Informe a barbearia vinculada ao login." });
  }

  const { data: shop, error: shopError } = await adminClient
    .from("barbershops")
    .select("id, slug")
    .eq("slug", barbershopSlug)
    .maybeSingle();

  if (shopError || !shop) {
    return response.status(404).json({ ok: false, error: "Barbearia não encontrada para vincular o login." });
  }

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

  const requesterRole = normalizeRole(barbershopAdmin?.role);
  const canManageLogin = Boolean(platformAdmin) || requesterRole === "owner";

  if (platformError || adminError || !canManageLogin) {
    return response.status(403).json({
      ok: false,
      error: "Apenas o desenvolvedor da plataforma ou o dono desta barbearia pode criar ou alterar logins.",
    });
  }

  if (!platformAdmin && role === "platform") {
    role = "manager";
  }

  let authUser = null;
  const metadata = {
    barbershop_id: shop.id,
    barbershop_slug: shop.slug,
    role,
  };

  const { data: createdData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: metadata,
  });

  if (createError) {
    const existingUser = await findUserByEmail(adminClient, email);

    if (!existingUser) {
      return response.status(400).json({ ok: false, error: errorMessage(createError) });
    }

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

    if (updateError) {
      return response.status(400).json({ ok: false, error: errorMessage(updateError) });
    }

    authUser = updatedData?.user || existingUser;
  } else {
    authUser = createdData?.user;
  }

  const { error: upsertError } = await adminClient.from("barbershop_admins").upsert(
    {
      barbershop_id: shop.id,
      user_id: authUser?.id || null,
      email,
      role,
      active,
    },
    { onConflict: "barbershop_id,email" }
  );

  if (upsertError) {
    return response.status(400).json({ ok: false, error: errorMessage(upsertError) });
  }

  return response.status(200).json({
    ok: true,
    user_id: authUser?.id || null,
    email,
    barbershop_slug: shop.slug,
  });
}
