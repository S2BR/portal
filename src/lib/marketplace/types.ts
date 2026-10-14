/**
 * Shared Marketplace (classifieds) types + enum unions, mirroring the API's Marketplace module. Pure
 * and client-safe (no server-only imports), so both the server data lib and client components use it.
 */

export type AdStatus = "available" | "reserved" | "sold" | "given" | "expired";

export type PriceType = "fixed" | "negotiable" | "free" | "trade" | "contact";

export type AdCondition = "new" | "like_new" | "good" | "fair" | "for_parts";

export type ContactMethod = "in_app" | "phone" | "whatsapp" | "email";

export const AD_STATUSES: AdStatus[] = [
  "available",
  "reserved",
  "sold",
  "given",
  "expired",
];

/** Statuses an owner may set on their ad (the rest are system-driven). */
export const SETTABLE_AD_STATUSES: AdStatus[] = [
  "available",
  "reserved",
  "sold",
  "given",
];

export const PRICE_TYPES: PriceType[] = [
  "fixed",
  "negotiable",
  "free",
  "trade",
  "contact",
];

export const AD_CONDITIONS: AdCondition[] = [
  "new",
  "like_new",
  "good",
  "fair",
  "for_parts",
];

export const CONTACT_METHODS: ContactMethod[] = [
  "in_app",
  "phone",
  "whatsapp",
  "email",
];

/** Badge tone per ad status (matches the shared Badge variants). */
export const AD_STATUS_VARIANT: Record<
  AdStatus,
  "green" | "gold" | "red" | "neutral" | "outline"
> = {
  available: "green",
  reserved: "gold",
  sold: "neutral",
  given: "neutral",
  expired: "red",
};

/** Whether a price type carries a price amount. */
export function priceTypeHasAmount(type: PriceType): boolean {
  return type === "fixed" || type === "negotiable";
}

/** Whether a contact method needs a value (number/email); in-app does not. */
export function contactMethodNeedsValue(method: ContactMethod): boolean {
  return method !== "in_app";
}

export interface AdImage {
  id: string;
  url: string | null;
}

/** An ad's location — approximate only (no exact address). */
export interface AdLocation {
  label: string | null;
  latitude: string | null;
  longitude: string | null;
}

/** A marketplace ad as returned by the API (`MarketplaceAdResource`). */
export interface MarketplaceAd {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number | null;
  currency: string | null;
  price_type: PriceType;
  condition: AdCondition | null;
  status: AdStatus;
  location: AdLocation;
  contact_method: ContactMethod;
  contact_value?: string | null;
  queue_enabled: boolean;
  images: AdImage[];
  is_expired: boolean;
  expires_at: string | null;
  renewed_at: string | null;
  created_at: string | null;
}

/** A paginated page of ads. */
export interface AdsPage {
  data: MarketplaceAd[];
  meta: { current_page: number; last_page: number; total: number };
}

/** A single renewal entry in an ad's history. */
export interface AdRenewal {
  renewed_at: string | null;
  previous_expires_at: string | null;
  new_expires_at: string;
}
