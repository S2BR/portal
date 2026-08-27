/**
 * The currencies a business can price a product in. Shared by the add-product sheet and the row
 * editor so the list stays in one place (previously hardcoded inside the products component).
 */
export const CURRENCIES = ["CAD", "BRL", "USD", "EUR"] as const;

export type Currency = (typeof CURRENCIES)[number];
