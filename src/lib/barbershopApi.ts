import { supabase } from "./supabaseClient";
import { callAdminRpc, callRpc, callRpcWithRestFallback } from "./apiCore";
import { getAdminAppointments } from "./appointmentsApi";

export const assetBucketName = "agendapro-assets";

export function getBarbershopBySlug(slug: string) {
  return supabase
    .from("barbershops")
    .select("*")
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();
}

export async function getBarbershopIdBySlug(slug: string) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", slug)
    .is("archived_at", null)
    .maybeSingle();

  if (error) throw error;
  return data?.id || "";
}

export function getProfessionalsByBarbershop(barbershopId: string) {
  return supabase.from("professionals").select("*").eq("barbershop_id", barbershopId);
}

export async function getBarbershopCloudBundle(
  slug: string,
  options: { includeAdminData?: boolean } = {}
) {
  const businessResult = await getBarbershopBySlug(slug);

  if (businessResult.error || !businessResult.data) {
    return { businessResult, relatedResults: null };
  }

  const business = businessResult.data;
  const includeAdminData = Boolean(options.includeAdminData);
  const relatedResults = await Promise.all([
    supabase.from("barbershop_accounts").select("*").eq("barbershop_id", business.id).maybeSingle(),
    supabase
      .from("services")
      .select("*")
      .eq("barbershop_id", business.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true }),
    supabase
      .from("professionals")
      .select("*")
      .eq("barbershop_id", business.id)
      .order("fixed", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("working_hours").select("*").eq("barbershop_id", business.id),
    supabase.from("schedule_breaks").select("*").eq("barbershop_id", business.id),
    supabase.from("days_off").select("*").eq("barbershop_id", business.id),
    supabase.from("schedule_blocks").select("*").eq("barbershop_id", business.id),
    includeAdminData
      ? getAdminAppointments({ target_slug: business.slug })
      : Promise.resolve({ data: [], error: null }),
    includeAdminData
      ? callRpc("get_barbershop_accesses", { target_slug: business.slug })
      : Promise.resolve({ data: [], error: null }),
    supabase.from("feature_flags").select("*").eq("barbershop_id", business.id),
    supabase
      .from("waitlist")
      .select("*")
      .eq("barbershop_id", business.id)
      .order("created_at", { ascending: false }),
  ]);

  return { businessResult, relatedResults };
}

export function saveBusinessSettings(payload: Record<string, unknown>) {
  return callAdminRpc("save_business_settings", payload);
}

export function savePromotionSettings(payload: Record<string, unknown>) {
  return callAdminRpc("save_promotion_settings", payload);
}

export function savePromotions(payload: Record<string, unknown>) {
  return callAdminRpc("save_promotions", payload);
}

export function saveBarbershopAccesses(payload: Record<string, unknown>) {
  return callAdminRpc("save_barbershop_accesses", payload);
}

export function saveFeatureFlags(payload: Record<string, unknown>) {
  return callAdminRpc("save_feature_flags", payload);
}

export function saveProfessionals(payload: Record<string, unknown>) {
  return callAdminRpc("save_professionals", payload);
}

export function saveScheduleSettings(payload: Record<string, unknown>) {
  return callAdminRpc("save_schedule_settings", payload);
}

export function saveBackgroundSettings(payload: Record<string, unknown>) {
  return callAdminRpc("save_background_settings", payload);
}

export function saveAppearanceCenter(payload: Record<string, unknown>) {
  return callAdminRpc("save_appearance_center", payload);
}

export function savePremiumAppearance(payload: Record<string, unknown>) {
  return callAdminRpc("save_premium_appearance", payload);
}

export function hasFeature(slug: string, feature: string) {
  return callRpc("has_feature", { target_slug: slug, feature });
}

export function getClientHistory(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("get_client_history", payload);
}

export function getClientProfileByEmail(payload: Record<string, unknown>) {
  return callRpc("get_client_profile_by_email", payload);
}

export function linkClientGoogleProfile(payload: Record<string, unknown>) {
  return callRpc("link_client_google_profile", payload);
}

export function getPublicAssetUrl(path: string) {
  return supabase.storage.from(assetBucketName).getPublicUrl(path);
}

export function uploadAsset(path: string, file: File, options: Record<string, unknown>) {
  return supabase.storage.from(assetBucketName).upload(path, file, options);
}
