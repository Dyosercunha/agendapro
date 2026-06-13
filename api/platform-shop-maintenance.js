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

const allowedAccessEmailDomains = ["gmail.com", "agendapro.com"];

function cleanEmail(value = "") {
  return String(value).trim().toLowerCase();
}

function isAllowedAccessEmailDomain(value = "") {
  const domain = cleanEmail(value).split("@").pop() || "";
  return allowedAccessEmailDomains.includes(domain);
}

function errorMessage(error) {
  return error?.message || error?.error_description || String(error || "Erro desconhecido.");
}

function makeSlug(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function planPrice(plan = "professional", explicitPrice) {
  const parsed = Number(explicitPrice);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  if (plan === "starter") return 49;
  if (plan === "premium") return 149;
  return 89;
}

function mapsUrlFor(address = "") {
  const clean = String(address || "").trim();
  return clean ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}` : "";
}

function normalizeBrazilWhatsapp(value = "") {
  let digits = String(value || "").replace(/\D/g, "");

  while (digits.startsWith("0")) digits = digits.slice(1);
  if (digits.startsWith("550")) digits = `55${digits.slice(3)}`;
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) return digits;
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits;
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

async function syncPlatformDevelopersToShop(adminClient, barbershopId) {
  const { data: admins, error } = await adminClient
    .from("platform_admins")
    .select("email, active")
    .eq("active", true);

  if (error) throw error;

  const rows = (admins || [])
    .map((item) => cleanEmail(item.email))
    .filter(Boolean)
    .map((email) => ({
      active: true,
      barbershop_id: barbershopId,
      email,
      role: "platform",
    }));

  if (!rows.length) return;

  const { error: upsertError } = await adminClient
    .from("barbershop_admins")
    .upsert(rows, { onConflict: "barbershop_id,email" });

  if (upsertError) throw upsertError;
}

async function getShopBySlug(adminClient, slugValue) {
  const slug = makeSlug(slugValue);

  if (!slug) throw new Error("Informe a barbearia.");

  const { data: shop, error } = await adminClient
    .from("barbershops")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!shop) throw new Error("Barbearia nao encontrada.");

  return shop;
}

async function createBarbershop(adminClient, payload) {
  const name = String(payload.name || payload.name_input || "").trim();
  const slug = makeSlug(payload.slug || payload.slug_input || name);
  const whatsapp = normalizeBrazilWhatsapp(payload.whatsapp || payload.whatsapp_input || "");
  const ownerEmail = cleanEmail(payload.owner_email || payload.owner_email_input);
  const plan = String(payload.plan || payload.plan_input || "professional");
  const monthlyStatus = String(payload.monthly_status || payload.monthly_status_input || "trial");
  const nextBillingDate = payload.next_billing_date || payload.next_billing_date_input || null;
  const address = String(payload.address || payload.address_input || "").trim();
  const pixKey = String(payload.pix_key || payload.pix_key_input || "").trim();
  const logoUrl = String(payload.logo_url || payload.logo_url_input || "").trim();
  const themeColor = String(payload.theme_color || payload.theme_color_input || "#22c55e").trim() || "#22c55e";
  const price = planPrice(plan, payload.plan_price || payload.plan_price_input);
  const skipDefaults =
    payload.skip_defaults === true ||
    payload.skip_defaults === "true" ||
    payload.onboarding === true ||
    payload.onboarding_input === true;

  if (!name) throw new Error("Informe o nome da barbearia.");
  if (!slug) throw new Error("Informe um slug valido para a barbearia.");
  if (!ownerEmail || !ownerEmail.includes("@")) throw new Error("Informe o e-mail do dono.");
  if (!isAllowedAccessEmailDomain(ownerEmail)) {
    throw new Error("Use um e-mail @gmail.com ou @agendapro.com cadastrado pela plataforma.");
  }

  const { data: existing, error: existingError } = await adminClient
    .from("barbershops")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existingError) throw existingError;
  if (existing) throw new Error(`O slug "${slug}" ja esta cadastrado.`);

  const { data: shop, error: shopError } = await adminClient
    .from("barbershops")
    .insert({
      address,
      automatic_confirmation_enabled: true,
      logo_text: name.slice(0, 1).toUpperCase(),
      logo_url: logoUrl || null,
      maps_url: mapsUrlFor(address),
      name,
      pix_discount: 10,
      pix_enabled: true,
      pix_key: pixKey,
      slug,
      theme_color: themeColor,
      theme_color_secondary: "#4ade80",
      whatsapp,
    })
    .select("id, slug")
    .single();

  if (shopError) throw shopError;

  const barbershopId = shop.id;

  const { error: accountError } = await adminClient.from("barbershop_accounts").insert({
    barbershop_id: barbershopId,
    monthly_status: monthlyStatus,
    next_billing_date: nextBillingDate,
    owner_email: ownerEmail,
    plan,
    plan_price: price,
  });

  if (accountError) throw accountError;

  const { error: ownerAdminError } = await adminClient.from("barbershop_admins").upsert(
    {
      active: true,
      barbershop_id: barbershopId,
      email: ownerEmail,
      role: "owner",
    },
    { onConflict: "barbershop_id,email" }
  );

  if (ownerAdminError) throw ownerAdminError;

  await syncPlatformDevelopersToShop(adminClient, barbershopId);

  if (!skipDefaults) {
    const { error: professionalError } = await adminClient.from("professionals").insert({
      active: true,
      barbershop_id: barbershopId,
      fixed: true,
      name: "Primeiro disponivel",
    });

    if (professionalError) throw professionalError;

    const { error: servicesError } = await adminClient.from("services").insert([
      { active: true, barbershop_id: barbershopId, duration: 30, name: "Corte de cabelo", price: 35, sort_order: 1 },
      { active: true, barbershop_id: barbershopId, duration: 20, name: "Barba", price: 25, sort_order: 2 },
      { active: true, barbershop_id: barbershopId, duration: 10, name: "Sobrancelha", price: 15, sort_order: 3 },
    ]);

    if (servicesError) throw servicesError;

    const workingHours = Array.from({ length: 7 }, (_, weekDay) => ({
      barbershop_id: barbershopId,
      enabled: weekDay >= 1 && weekDay <= 6,
      end_time: weekDay === 6 ? "16:00" : "18:00",
      start_time: "08:00",
      week_day: weekDay,
    }));

    const { error: hoursError } = await adminClient.from("working_hours").insert(workingHours);
    if (hoursError) throw hoursError;

    const { error: breakError } = await adminClient.from("schedule_breaks").insert({
      barbershop_id: barbershopId,
      end_time: "13:00",
      name: "Almoco",
      start_time: "12:00",
    });
    if (breakError) throw breakError;
  }

  const featureKeys = [
    "pix",
    "auto_confirmation",
    "service_delete",
    "backplate",
    "appearance_media",
    "promotions",
    "visual_agenda",
    "commissions",
    "waitlist",
    "loyalty",
    "instagram_booking",
    "google_login",
    "unique_link",
  ];

  const { error: featureError } = await adminClient.from("feature_flags").insert(
    featureKeys.map((featureKey) => ({
      barbershop_id: barbershopId,
      enabled: ["pix", "auto_confirmation"].includes(featureKey),
      feature_key: featureKey,
      released: ["pix", "auto_confirmation"].includes(featureKey),
    }))
  );

  if (featureError) throw featureError;

  return {
    barbershop_id: barbershopId,
    link_cliente: `https://calendarproapp.vercel.app/agendamento/${slug}`,
    link_painel: `https://calendarproapp.vercel.app/painel/${slug}`,
    slug,
  };
}

async function updateBasicBarbershop(adminClient, payload) {
  const targetSlug = payload.target_slug || payload.slug || payload.slug_input;
  const shop = await getShopBySlug(adminClient, targetSlug);
  const name = String(payload.name || payload.name_input || "").trim();
  const whatsapp = normalizeBrazilWhatsapp(payload.whatsapp || payload.whatsapp_input || "");
  const ownerEmail = cleanEmail(payload.owner_email || payload.owner_email_input);
  const plan = String(payload.plan || payload.plan_input || "professional");
  const monthlyStatus = String(payload.monthly_status || payload.monthly_status_input || "trial");
  const nextBillingDate = payload.next_billing_date || payload.next_billing_date_input || null;
  const address = String(payload.address || payload.address_input || "").trim();
  const pixKey = String(payload.pix_key || payload.pix_key_input || "").trim();
  const logoUrl = String(payload.logo_url || payload.logo_url_input || "").trim();
  const themeColor = String(payload.theme_color || payload.theme_color_input || "#22c55e").trim() || "#22c55e";
  const price = planPrice(plan, payload.plan_price || payload.plan_price_input);

  if (!name) throw new Error("Informe o nome da barbearia.");
  if (!ownerEmail || !ownerEmail.includes("@")) throw new Error("Informe o e-mail do dono.");
  if (!isAllowedAccessEmailDomain(ownerEmail)) {
    throw new Error("Use um e-mail @gmail.com ou @agendapro.com cadastrado pela plataforma.");
  }

  const updateData = {
    address,
    logo_text: name.slice(0, 1).toUpperCase(),
    maps_url: mapsUrlFor(address),
    name,
    pix_key: pixKey,
    theme_color: themeColor,
    whatsapp,
  };

  if (logoUrl) updateData.logo_url = logoUrl;

  const { error: shopError } = await adminClient.from("barbershops").update(updateData).eq("id", shop.id);
  if (shopError) throw shopError;

  const { error: accountError } = await adminClient.from("barbershop_accounts").upsert(
    {
      barbershop_id: shop.id,
      monthly_status: monthlyStatus,
      next_billing_date: nextBillingDate,
      owner_email: ownerEmail,
      plan,
      plan_price: price,
    },
    { onConflict: "barbershop_id" }
  );
  if (accountError) throw accountError;

  const { error: adminError } = await adminClient.from("barbershop_admins").upsert(
    {
      active: true,
      barbershop_id: shop.id,
      email: ownerEmail,
      role: "owner",
    },
    { onConflict: "barbershop_id,email" }
  );
  if (adminError) throw adminError;

  await syncPlatformDevelopersToShop(adminClient, shop.id);

  return {
    barbershop_id: shop.id,
    link_cliente: `https://calendarproapp.vercel.app/agendamento/${shop.slug}`,
    link_painel: `https://calendarproapp.vercel.app/painel/${shop.slug}`,
    slug: shop.slug,
  };
}

async function saveOnboardingServices(adminClient, payload) {
  const shop = await getShopBySlug(adminClient, payload.target_slug || payload.slug);
  const services = Array.isArray(payload.services_input) ? payload.services_input : [];
  const now = new Date().toISOString();

  if (!services.length) throw new Error("Cadastre pelo menos um servico.");

  let archiveError = null;
  const archiveResult = await adminClient
    .from("services")
    .update({ active: false, deleted_at: now })
    .eq("barbershop_id", shop.id)
    .is("deleted_at", null);
  archiveError = archiveResult.error;

  if (archiveError && String(archiveError.message || "").includes("deleted_at")) {
    const fallback = await adminClient.from("services").update({ active: false }).eq("barbershop_id", shop.id);
    if (fallback.error) throw fallback.error;
  } else if (archiveError) {
    throw archiveError;
  }

  const rows = services
    .map((service, index) => ({
      active: true,
      barbershop_id: shop.id,
      duration: Math.max(5, Number(service.duration || 0)),
      name: String(service.name || "").trim(),
      price: Math.max(0, Number(service.price || 0)),
      sort_order: Number(service.sort_order || index + 1),
    }))
    .filter((service) => service.name);

  if (!rows.length) throw new Error("Cadastre pelo menos um servico com nome.");

  const { error } = await adminClient.from("services").insert(rows);
  if (error) throw error;

  return { barbershop_id: shop.id, count: rows.length, slug: shop.slug };
}

async function saveOnboardingProfessionals(adminClient, payload) {
  const shop = await getShopBySlug(adminClient, payload.target_slug || payload.slug);
  const professionals = Array.isArray(payload.professionals_input) ? payload.professionals_input : [];
  const solo = payload.solo_input === true || payload.solo_input === "true" || !professionals.length;

  const { error: deleteError } = await adminClient.from("professionals").delete().eq("barbershop_id", shop.id);
  if (deleteError) throw deleteError;

  const rows = solo
    ? [{ active: true, barbershop_id: shop.id, fixed: true, name: "Primeiro disponivel", photo_url: null }]
    : professionals
        .map((professional) => ({
          active: true,
          barbershop_id: shop.id,
          fixed: false,
          name: String(professional.name || "").trim(),
          photo_url: professional.photo_url || null,
        }))
        .filter((professional) => professional.name);

  let { error } = await adminClient.from("professionals").insert(rows);

  if (error && String(error.message || "").includes("photo_url")) {
    const rowsWithoutPhoto = rows.map(({ photo_url, ...row }) => row);
    const fallback = await adminClient.from("professionals").insert(rowsWithoutPhoto);
    error = fallback.error;
  }

  if (error) throw error;

  return { barbershop_id: shop.id, count: rows.length, slug: shop.slug };
}

async function saveOnboardingHours(adminClient, payload) {
  const shop = await getShopBySlug(adminClient, payload.target_slug || payload.slug);
  const hours = Array.isArray(payload.working_hours_input) ? payload.working_hours_input : [];

  if (!hours.length) throw new Error("Informe os horarios de funcionamento.");

  const rows = hours.map((hour) => ({
    barbershop_id: shop.id,
    enabled: hour.enabled !== false,
    end_time: String(hour.end_time || "20:00").slice(0, 5),
    start_time: String(hour.start_time || "10:00").slice(0, 5),
    week_day: Number(hour.week_day),
  }));

  const { error: deleteError } = await adminClient.from("working_hours").delete().eq("barbershop_id", shop.id);
  if (deleteError) throw deleteError;

  const { error } = await adminClient.from("working_hours").insert(rows);
  if (error) throw error;

  return { barbershop_id: shop.id, count: rows.length, slug: shop.slug };
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

    if (action === "create") {
      const shop = await createBarbershop(adminClient, payload);
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, shop, barbershops });
    }

    if (action === "update-basic") {
      const shop = await updateBasicBarbershop(adminClient, payload);
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, shop, barbershops });
    }

    if (action === "save-services") {
      const data = await saveOnboardingServices(adminClient, payload);
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, data, barbershops });
    }

    if (action === "save-professionals") {
      const data = await saveOnboardingProfessionals(adminClient, payload);
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, data, barbershops });
    }

    if (action === "save-hours") {
      const data = await saveOnboardingHours(adminClient, payload);
      const barbershops = await listDiagnostics(adminClient);
      return response.status(200).json({ ok: true, data, barbershops });
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
