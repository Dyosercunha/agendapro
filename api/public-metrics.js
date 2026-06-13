import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "https://opcuaxkndslmejhuauyq.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  "";

function asNumber(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return number;
}

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({
      ok: false,
      error: "Método não permitido.",
    });
  }

  if (!supabaseUrl || !supabaseKey) {
    return response.status(200).json({
      ok: true,
      barbershops: 0,
      appointments: 0,
      source: "fallback",
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const [shopCountResult, appointmentCountResult] = await Promise.all([
      supabase
        .from("barbershops")
        .select("id", { count: "exact", head: true })
        .is("archived_at", null),
      supabase.from("appointments").select("id", { count: "exact", head: true }),
    ]);

    if (shopCountResult.error || appointmentCountResult.error) {
      return response.status(200).json({
        ok: true,
        barbershops: 0,
        appointments: 0,
        source: "fallback",
      });
    }

    return response.status(200).json({
      ok: true,
      barbershops: asNumber(shopCountResult.count),
      appointments: asNumber(appointmentCountResult.count),
      source: "supabase",
    });
  } catch {
    return response.status(200).json({
      ok: true,
      barbershops: 0,
      appointments: 0,
      source: "fallback",
    });
  }
}
