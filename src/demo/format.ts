/** Display formatting only. Calculations stay in full-precision decimal strings from the engine. */
export function money(value: string | number | null | undefined, currency: string, locale = "en-GB", digits = 2) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(Number(value));
}
export function pct(value: string | number | null | undefined, digits = 1) {
  if (value === null || value === undefined || value === "") return "—";
  return `${(Number(value) * 100).toFixed(digits)} %`;
}
export function qty(value: string | number | null | undefined, max = 3) {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: max }).format(Number(value));
}
export function date(iso: string | null) {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
export const isPlainDecimal = (s: string) => /^\d+(\.\d+)?$/.test(s.trim());
