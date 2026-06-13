export function onlyDigits(value = "") {
  return String(value || "").replace(/\D/g, "");
}

export function normalizeBrazilWhatsapp(value = "") {
  let digits = onlyDigits(value);

  while (digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.startsWith("550")) {
    digits = `55${digits.slice(3)}`;
  }

  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    return digits;
  }

  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  return digits;
}

export function whatsappUrl(phone = "", message = "") {
  const normalizedPhone = normalizeBrazilWhatsapp(phone);
  const text = String(message || "").trim();
  const suffix = text ? `?text=${encodeURIComponent(text)}` : "";

  return `https://wa.me/${normalizedPhone}${suffix}`;
}
