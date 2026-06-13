import type { Barbershop } from "../types/app";

type WorkingHour = {
  enabled?: boolean;
  end?: string;
  start?: string;
};

type ScheduleLike = {
  workingHours?: Record<string, WorkingHour>;
};

const schemaDayMap: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const globalDescription =
  "AgendaPro: agendamento inteligente para barbearias, salões e estética.";

function ensureMeta(selector: string, attrs: Record<string, string>, content: string) {
  if (typeof document === "undefined") return;

  let element = document.head.querySelector<HTMLMetaElement>(selector);

  if (!element) {
    element = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => element?.setAttribute(key, value));
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

function setMetaName(name: string, content: string) {
  ensureMeta(`meta[name="${name}"]`, { name }, content);
}

function setMetaProperty(property: string, content: string) {
  ensureMeta(`meta[property="${property}"]`, { property }, content);
}

function ensureCanonical(url: string) {
  if (typeof document === "undefined") return;

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function ensureThemeColor(color: string) {
  setMetaName("theme-color", color || "#22c55e");
}

function clearSchema() {
  if (typeof document === "undefined") return;
  const current = document.getElementById("agendapro-localbusiness-schema");
  if (current) current.remove();
}

function upsertLocalBusinessSchema(business: Barbershop, schedule?: ScheduleLike) {
  if (typeof document === "undefined") return;

  const openingHoursSpecification = Object.entries(schedule?.workingHours || {})
    .filter(([, value]) => Boolean(value?.enabled))
    .map(([key, value]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: schemaDayMap[key] || "Monday",
      opens: String(value?.start || "08:00"),
      closes: String(value?.end || "18:00"),
    }));

  const schemaPayload = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: business.name || "AgendaPro",
    url: typeof window !== "undefined" ? window.location.href : "",
    telephone: business.whatsapp || "",
    address: business.address
      ? {
          "@type": "PostalAddress",
          streetAddress: business.address,
          addressCountry: "BR",
        }
      : undefined,
    openingHoursSpecification,
  };

  let script = document.getElementById("agendapro-localbusiness-schema") as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = "agendapro-localbusiness-schema";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(schemaPayload);
}

export function applyGlobalSeo() {
  if (typeof document === "undefined") return;
  ensureThemeColor("#22c55e");
  setMetaName("description", globalDescription);
  setMetaProperty("og:site_name", "AgendaPro");
}

export function applyLandingSeo() {
  if (typeof window === "undefined") return;
  applyGlobalSeo();
  const title = "AgendaPro — Agendamento inteligente para barbearias";
  const description =
    "Sua barbearia com agendamento profissional. Seus clientes agendam pelo celular e você gerencia tudo em um painel.";
  const canonicalUrl = `${window.location.origin}/`;
  const ogImage = `${window.location.origin}/agenda-pro-logo.png`;

  document.title = title;
  setMetaName("description", description);
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:type", "website");
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", ogImage);
  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", ogImage);
  ensureCanonical(canonicalUrl);
  clearSchema();
}

export function applyPlatformSeo() {
  if (typeof window === "undefined") return;
  applyGlobalSeo();
  const title = "AgendaPro — Painel Plataforma";
  const description = "Painel de gestão da plataforma AgendaPro para administrar barbearias e assinaturas.";
  const canonicalUrl = `${window.location.origin}/plataforma`;
  const ogImage = `${window.location.origin}/agenda-pro-logo.png`;

  document.title = title;
  setMetaName("description", description);
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:type", "website");
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", ogImage);
  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", ogImage);
  ensureCanonical(canonicalUrl);
  clearSchema();
}

export function applyClientBookingSeo(business: Barbershop, schedule?: ScheduleLike) {
  if (typeof window === "undefined") return;
  applyGlobalSeo();

  const shopName = business.name || "AgendaPro";
  const title = `${shopName} — Agendar Horário`;
  const description = `Agende seu horário na ${shopName}. Rápido, fácil e sem espera.`;
  const canonicalUrl = window.location.href;
  const slug = String(business.slug || "").trim();
  const ogImage = slug
    ? `${window.location.origin}/api/og?slug=${encodeURIComponent(slug)}`
    : `${window.location.origin}/agenda-pro-logo.png`;

  document.title = title;
  ensureThemeColor(String(business.themeColor || "#22c55e"));
  setMetaName("description", description);
  setMetaProperty("og:title", title);
  setMetaProperty("og:description", description);
  setMetaProperty("og:type", "website");
  setMetaProperty("og:url", canonicalUrl);
  setMetaProperty("og:image", ogImage);
  setMetaName("twitter:card", "summary_large_image");
  setMetaName("twitter:title", title);
  setMetaName("twitter:description", description);
  setMetaName("twitter:image", ogImage);
  ensureCanonical(canonicalUrl);
  upsertLocalBusinessSchema(business, schedule);
}
