const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});
const numberFmt = new Intl.NumberFormat("pt-BR");

export const formatMoney = (cents: number) => brl.format(cents / 100);
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));
export const formatNumber = (n: number) => numberFmt.format(n);
export const formatPercent = (n: number, digits = 1) => `${n.toFixed(digits).replace(".", ",")}%`;
export const formatOrderNumber = (n: number) => `PB-${String(n).padStart(6, "0")}`;

/** Converte "1.234,56" / "1234.56" / "49,9" em centavos. Retorna NaN se inválido. */
export function parseMoneyToCents(input: string): number {
  const raw = input.trim().replace(/[R$\s]/g, "");
  if (!raw) return NaN;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : NaN;
}

export const centsToInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function relativeTime(d: Date | string) {
  const diff = Date.now() - new Date(d).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const days = Math.round(h / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return formatDate(d);
}
