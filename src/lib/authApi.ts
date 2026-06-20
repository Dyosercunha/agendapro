import { supabase } from "./supabaseClient";
import { fetchJson, getSessionToken, postJson } from "./apiCore";

export function getAuthSession() {
  return supabase.auth.getSession();
}

export function onAuthStateChange(callback: Parameters<typeof supabase.auth.onAuthStateChange>[0]) {
  return supabase.auth.onAuthStateChange(callback);
}

export function loginWithGoogleRedirect(redirectTo: string) {
  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      queryParams: {
        prompt: "select_account",
      },
      redirectTo,
    },
  });
}

export function loginWithEmailPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
}

export function logoutAuth() {
  return supabase.auth.signOut();
}

export function updateCurrentPassword(password: string) {
  return supabase.auth.updateUser({ password });
}

export function getMyAdminContext(targetSlug?: string) {
  const cleanSlug = String(targetSlug || "").trim().toLowerCase();

  return cleanSlug
    ? supabase.rpc("get_my_admin_context", { target_slug: cleanSlug })
    : supabase.rpc("get_my_admin_context");
}

export function getAdminAuthHealth() {
  return fetchJson("/api/admin-auth-user");
}

export async function syncAdminAuthUser(payload: {
  barbershopId?: string;
  barbershopSlug?: string;
  email: string;
  password: string;
  role: string;
  active?: boolean;
}) {
  const token = await getSessionToken();
  return postJson("/api/admin-auth-user", payload, token);
}

export async function getPlatformAuthAccesses() {
  const token = await getSessionToken();
  return postJson("/api/platform-auth-user", { action: "list" }, token);
}

export async function syncPlatformAuthUser(payload: {
  active?: boolean;
  email: string;
  password?: string;
}) {
  const token = await getSessionToken();
  return postJson("/api/platform-auth-user", { action: "upsert", ...payload }, token);
}
