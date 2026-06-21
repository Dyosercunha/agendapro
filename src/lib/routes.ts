export const appRoutePrefixes = ["painel", "agendamento", "barbearia"] as const;

export const platformRouteSegments = ["plataforma", "painel-plataforma"] as const;

export const rootRouteAliases = ["/", "/agenda-pro", "/agendapro"] as const;

export const reservedRouteSegments = new Set([
  ...appRoutePrefixes,
  ...platformRouteSegments,
  "agenda-pro",
  "agendapro",
  "api",
  "assets",
  "manifest.json",
  "sw.js",
]);

export function normalizedPathname(pathname: string) {
  return String(pathname || "").toLowerCase().replace(/\/$/, "") || "/";
}

export function routePartsFromPathname(pathname: string) {
  return normalizedPathname(pathname).split("/").filter(Boolean);
}

export function isLegacyBareSlugPath(pathname: string) {
  const parts = routePartsFromPathname(pathname);
  const head = parts[0] || "";

  return parts.length === 1 && Boolean(head) && !reservedRouteSegments.has(head);
}

export function isRootRoutePath(pathname: string) {
  return rootRouteAliases.includes(normalizedPathname(pathname) as (typeof rootRouteAliases)[number]);
}

export function isPlatformRoutePath(pathname: string, search = "") {
  const path = normalizedPathname(pathname);

  return search.includes("platform=1") || platformRouteSegments.some((segment) => path.includes(`/${segment}`));
}
