import { supabase, supabaseAnonKey, supabaseUrl } from "./supabaseClient";

export function apiErrorText(error: unknown) {
  if (!error) return "Erro desconhecido.";

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object") {
    const errorData = error as {
      details?: string;
      error_description?: string;
      hint?: string;
      message?: string;
    };

    return (
      errorData.message ||
      errorData.details ||
      errorData.hint ||
      errorData.error_description ||
      String(error)
    );
  }

  return String(error);
}

export function apiResultError(message: string, extra: Record<string, unknown> = {}) {
  return {
    data: null,
    error: {
      message,
      ...extra,
    },
  };
}

export async function getSessionToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("Sessão expirada. Entre novamente para continuar.");
  }

  return token;
}

export async function fetchJson(url: string, options: RequestInit = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || (data && data.ok === false)) {
    throw new Error(data?.error || response.statusText || `Falha ao chamar ${url}.`);
  }

  return data;
}

export async function postJson(url: string, payload: unknown, token?: string) {
  return fetchJson(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}

export async function callRpc(functionName: string, payload: Record<string, unknown> = {}) {
  return supabase.rpc(functionName, payload);
}

export async function callRpcWithRestFallback(
  functionName: string,
  payload: Record<string, unknown> = {},
  options: { shouldFallback?: (error: unknown) => boolean } = {}
) {
  const result = await callRpc(functionName, payload);

  const canFallback = options.shouldFallback ? options.shouldFallback(result.error) : true;

  if (!result.error || !canFallback) {
    return result;
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: supabaseAnonKey,
        authorization: `Bearer ${supabaseAnonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
      return apiResultError(text || response.statusText, { code: String(response.status) });
    }

    return {
      data: text ? JSON.parse(text) : null,
      error: null,
    };
  } catch (fallbackError) {
    return apiResultError(apiErrorText(result.error), {
      details: apiErrorText(fallbackError),
    });
  }
}
