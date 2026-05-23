export function onlyDigits(value = "") {
  return String(value).replace(/\D/g, "");
}

export function money(value = 0) {
  return Number(value || 0).toLocaleString("pt-BR", {
    currency: "BRL",
    style: "currency",
  });
}

export function formatDatePtBr(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("pt-BR");
}
