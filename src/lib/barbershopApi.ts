import { supabase } from "./supabaseClient";
import { callRpc, callRpcWithRestFallback } from "./apiCore";

export const assetBucketName = "agendapro-assets";

export function getBarbershopBySlug(slug: string) {
  return supabase.from("barbershops").select("*").eq("slug", slug).single();
}

export async function getBarbershopIdBySlug(slug: string) {
  const { data, error } = await supabase
    .from("barbershops")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data?.id || "";
}

export function getProfessionalsByBarbershop(barbershopId: string) {
  return supabase.from("professionals").select("*").eq("barbershop_id", barbershopId);
}

export async function getBarbershopCloudBundle(slug: string) {
  const businessResult = await getBarbershopBySlug(slug);

  if (businessResult.error || !businessResult.data) {
    return { businessResult, relatedResults: null };
  }

  const business = businessResult.data;
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
    callRpc("get_admin_appointments", { target_slug: business.slug }),
    callRpc("get_barbershop_accesses", { target_slug: business.slug }),
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
  return callRpcWithRestFallback("save_business_settings", payload);
}

export function savePromotionSettings(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_promotion_settings", payload);
}

export function savePromotions(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_promotions", payload);
}

export function saveBarbershopAccesses(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_barbershop_accesses", payload);
}

export function saveFeatureFlags(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_feature_flags", payload);
}

export function saveProfessionals(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_professionals", payload);
}

export function saveScheduleSettings(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_schedule_settings", payload);
}

export function saveBackgroundSettings(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_background_settings", payload);
}

export function saveAppearanceCenter(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_appearance_center", payload);
}

export function savePremiumAppearance(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("save_premium_appearance", payload);
}

export function getClientHistory(payload: Record<string, unknown>) {
  return callRpcWithRestFallback("get_client_history", payload);
}

export function getPublicAssetUrl(path: string) {
  return supabase.storage.from(assetBucketName).getPublicUrl(path);
}

export function uploadAsset(path: string, file: File, options: Record<string, unknown>) {
  return supabase.storage.from(assetBucketName).upload(path, file, options);
}
