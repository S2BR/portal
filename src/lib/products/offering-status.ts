/**
 * A business's offering state for a catalog product — the owner-controlled availability (distinct from
 * moderation status). Mirrors the API's `OfferingStatus` enum. Only `available` shows to customers;
 * labels are localized via the `offeringStatus.<code>` message key.
 */
export type OfferingStatus =
  "available" | "paused" | "out_of_stock" | "coming_soon" | "discontinued";

export const OFFERING_STATUSES: OfferingStatus[] = [
  "available",
  "paused",
  "out_of_stock",
  "coming_soon",
  "discontinued",
];

/** Badge tone per status (matches the shared Badge variants). */
export const OFFERING_STATUS_VARIANT: Record<
  OfferingStatus,
  "green" | "gold" | "red" | "neutral" | "outline"
> = {
  available: "green",
  paused: "gold",
  out_of_stock: "red",
  coming_soon: "neutral",
  discontinued: "outline",
};

export function isOfferingStatus(value: string): value is OfferingStatus {
  return (OFFERING_STATUSES as string[]).includes(value);
}
