export const allowedAccessEmailDomains = ["gmail.com", "agendapro.com"];

export const allowedAccessEmailMessage =
  "Use um e-mail @gmail.com ou @agendapro.com cadastrado pela plataforma.";

export function normalizeAccessEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

export function isAllowedAccessEmailDomain(value = "") {
  const email = normalizeAccessEmail(value);
  const domain = email.split("@").pop() || "";

  return allowedAccessEmailDomains.includes(domain);
}
