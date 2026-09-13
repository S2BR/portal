/**
 * Format an integer minor-unit amount (cents) as a localized currency string. Money is stored as an
 * integer minor unit everywhere; this is the one place it becomes a decimal for display.
 */
export function formatMoney(
  minor: number,
  currency: string | null,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(minor / 100);
}
