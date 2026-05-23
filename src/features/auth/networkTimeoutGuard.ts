const DEFAULT_TIMEOUT_MS = 9000;

function shouldTimeout(url: string): boolean {
  return /supabase\.co|\/rest\/v1|\/rpc\//i.test(url);
}

if (typeof window !== "undefined" && !(window as any).__agendaProNetworkTimeoutGuard) {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (!shouldTimeout(url)) {
      return originalFetch(input, init);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
    const mergedInit: RequestInit = {
      ...(init || {}),
      signal: init?.signal || controller.signal,
    };

    return originalFetch(input, mergedInit).finally(() => window.clearTimeout(timeout));
  };

  (window as any).__agendaProNetworkTimeoutGuard = true;
}

export {};
