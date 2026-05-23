export function pathSegments(pathname = window.location.pathname) {
  return pathname.split("/").map((part) => part.trim()).filter(Boolean);
}

export function barbershopSlugFromPath(pathname = window.location.pathname) {
  const parts = pathSegments(pathname);

  if (parts[0] === "agendamento" || parts[0] === "painel") return parts[1] || "";
  if (parts[0] === "plataforma" || parts[0] === "painel-plataforma") return "";

  return parts[0] || "";
}

export function clientBookingPath(slug: string) {
  return `/agendamento/${slug}`;
}

export function barberPanelPath(slug: string) {
  return `/painel/${slug}`;
}
