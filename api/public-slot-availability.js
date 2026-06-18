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

const firstAvailableLabels = new Set([
  "",
  "primeiro disponivel",
  "primeiro disponível",
  "profissional disponivel",
  "profissional disponível",
]);

function cleanText(value = "") {
  return String(value || "").trim();
}

function normalizeText(value = "") {
  return cleanText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function responseError(response, status, error, details = null) {
  return response.status(status).json({ ok: false, error, details });
}

function toMinutes(value) {
  const [hour = "0", minute = "0"] = String(value || "00:00").slice(0, 5).split(":");
  return Number(hour) * 60 + Number(minute);
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (/^\d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(raw)) return raw;
  return "";
}

function overlaps(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

function weekDayFromDate(dateText) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function appointmentBlocksSlot(item) {
  return !["cancelled", "canceled", "cancelado"].includes(
    normalizeText(item.status || "confirmed")
  );
}

function appointmentConflicts(
  item,
  startMinutes,
  endMinutes,
  professionalId = "",
  activeProfessionalCount = 0
) {
  if (!appointmentBlocksSlot(item)) return false;

  if (professionalId && item.professional_id && item.professional_id !== professionalId) {
    return false;
  }

  // Agendamentos antigos podem ter sido gravados sem professional_id.
  // Em barbearias com mais de um profissional, eles nao devem bloquear todos.
  // Se houver apenas um profissional ativo, continuam bloqueando a agenda dele.
  if (professionalId && !item.professional_id && activeProfessionalCount > 1) {
    return false;
  }

  const appointmentStart = toMinutes(item.appointment_time);
  const appointmentDuration = Math.max(Number(item.duration || 0), 0) || 30;
  const appointmentEnd = appointmentStart + appointmentDuration;

  return overlaps(startMinutes, endMinutes, appointmentStart, appointmentEnd);
}

function blockConflicts(item, startMinutes, endMinutes, professionalId = "") {
  if (professionalId && item.professional_id && item.professional_id !== professionalId) {
    return false;
  }

  return overlaps(startMinutes, endMinutes, toMinutes(item.start_time), toMinutes(item.end_time));
}

function publicAvailability(available, reason = "", extra = {}) {
  return {
    available,
    reason,
    ...extra,
  };
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return responseError(response, 405, "Metodo nao permitido.");
  }

  if (!serviceRoleKey) {
    return responseError(
      response,
      501,
      "SUPABASE_SERVICE_ROLE_KEY nao esta configurada no Vercel."
    );
  }

  const payload = typeof request.body === "string" ? JSON.parse(request.body || "{}") : request.body || {};
  const targetSlug = normalizeText(payload.target_slug || payload.slug);
  const targetDate = cleanText(payload.target_date || payload.date);
  const targetTime = normalizeTime(payload.target_time || payload.time);
  const requestedProfessional = cleanText(payload.target_professional || payload.professional);
  const requestedProfessionalKey = normalizeText(requestedProfessional);
  const duration = Math.max(Number(payload.target_duration || payload.duration_input || payload.duration || 30), 10);
  const startMinutes = toMinutes(targetTime);
  const endMinutes = startMinutes + duration;

  if (!targetSlug || !targetDate || !targetTime) {
    return responseError(response, 400, "Informe barbearia, data e horario.");
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data: shop, error: shopError } = await adminClient
    .from("barbershops")
    .select("id, slug, archived_at")
    .eq("slug", targetSlug)
    .maybeSingle();

  if (shopError) {
    return responseError(response, 400, "Nao foi possivel consultar a barbearia.", shopError.message);
  }

  if (!shop || shop.archived_at) {
    return response.status(200).json({
      ok: true,
      availability: publicAvailability(false, "barbershop_not_found"),
    });
  }

  const weekDay = weekDayFromDate(targetDate);

  if (weekDay === null) {
    return responseError(response, 400, "Data invalida.");
  }

  const [
    workResult,
    dayOffResult,
    breaksResult,
    blocksResult,
    professionalsResult,
    appointmentsResult,
  ] = await Promise.all([
    adminClient
      .from("working_hours")
      .select("start_time, end_time, enabled")
      .eq("barbershop_id", shop.id)
      .eq("week_day", weekDay)
      .maybeSingle(),
    adminClient
      .from("days_off")
      .select("id")
      .eq("barbershop_id", shop.id)
      .eq("date", targetDate)
      .limit(1),
    adminClient
      .from("schedule_breaks")
      .select("start_time, end_time")
      .eq("barbershop_id", shop.id),
    adminClient
      .from("schedule_blocks")
      .select("professional_id, start_time, end_time")
      .eq("barbershop_id", shop.id)
      .eq("date", targetDate),
    adminClient
      .from("professionals")
      .select("id, name, active, fixed, created_at")
      .eq("barbershop_id", shop.id)
      .eq("active", true)
      .order("fixed", { ascending: true })
      .order("created_at", { ascending: true }),
    adminClient
      .from("appointments")
      .select("professional_id, appointment_time, duration, status")
      .eq("barbershop_id", shop.id)
      .eq("appointment_date", targetDate),
  ]);

  const firstError = [
    workResult.error,
    dayOffResult.error,
    breaksResult.error,
    blocksResult.error,
    professionalsResult.error,
    appointmentsResult.error,
  ].find(Boolean);

  if (firstError) {
    return responseError(response, 400, "Nao foi possivel validar este horario.", firstError.message);
  }

  const workDay = workResult.data;

  if (!workDay || workDay.enabled === false) {
    return response.status(200).json({
      ok: true,
      availability: publicAvailability(false, "closed"),
    });
  }

  if (startMinutes < toMinutes(workDay.start_time) || endMinutes > toMinutes(workDay.end_time)) {
    return response.status(200).json({
      ok: true,
      availability: publicAvailability(false, "outside_working_hours"),
    });
  }

  if ((dayOffResult.data || []).length) {
    return response.status(200).json({
      ok: true,
      availability: publicAvailability(false, "day_off"),
    });
  }

  const breaks = breaksResult.data || [];
  if (breaks.some((item) => overlaps(startMinutes, endMinutes, toMinutes(item.start_time), toMinutes(item.end_time)))) {
    return response.status(200).json({
      ok: true,
      availability: publicAvailability(false, "break"),
    });
  }

  const blocks = blocksResult.data || [];
  const appointments = appointmentsResult.data || [];
  const professionals = (professionalsResult.data || []).filter((item) => !item.fixed);
  const isFirstAvailable = firstAvailableLabels.has(requestedProfessionalKey);

  let professional = null;

  if (!isFirstAvailable) {
    professional = professionals.find((item) => normalizeText(item.name) === requestedProfessionalKey) || null;

    if (!professional) {
      return response.status(200).json({
        ok: true,
        availability: publicAvailability(false, "professional_not_found"),
      });
    }

    if (blocks.some((item) => blockConflicts(item, startMinutes, endMinutes, professional.id))) {
      return response.status(200).json({
        ok: true,
        availability: publicAvailability(false, "blocked"),
      });
    }

    if (
      appointments.some((item) =>
        appointmentConflicts(item, startMinutes, endMinutes, professional.id, professionals.length)
      )
    ) {
      return response.status(200).json({
        ok: true,
        availability: publicAvailability(false, "busy"),
      });
    }
  } else {
    professional = professionals.find(
      (item) =>
        !blocks.some((block) => blockConflicts(block, startMinutes, endMinutes, item.id)) &&
        !appointments.some((appointment) =>
          appointmentConflicts(appointment, startMinutes, endMinutes, item.id, professionals.length)
        )
    );

    if (!professional) {
      return response.status(200).json({
        ok: true,
        availability: publicAvailability(false, "busy"),
      });
    }
  }

  return response.status(200).json({
    ok: true,
    availability: publicAvailability(true, "", {
      professionalId: professional?.id || "",
      professionalName: professional?.name || requestedProfessional,
    }),
  });
}
