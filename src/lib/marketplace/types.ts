/**
 * Shared Marketplace (classifieds) types + enum unions, mirroring the API's Marketplace module. Pure
 * and client-safe (no server-only imports), so both the server data lib and client components use it.
 */

import type { PublicFormLayout } from "@/lib/marketplace/layout";

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

/** The kind of a category field — drives which input the form renders. */
export type AttributeType =
  "select" | "multiselect" | "number" | "boolean" | "date" | "text";

/** A choice for a select/multiselect field, label localized by the API. */
export interface AttributeOption {
  value: string;
  label: string;
}

/** A category field definition (`MarketplaceAttributeResource`) — how the form renders one input. */
export interface AttributeField {
  key: string;
  label: string;
  type: AttributeType;
  unit: string | null;
  required: boolean;
  options: AttributeOption[] | null;
  /** A reference data source for the choices (e.g. "vehicle_make"), instead of static options. */
  source?: string | null;
  /** Field keys whose values this field's choices depend on (cascading, e.g. model → [make, year]). */
  depends_on?: string[];
  group: string | null;
}

/** An ad's category field values, keyed by field `key`. */
export type AdAttributes = Record<
  string,
  string | number | boolean | string[] | null
>;

/** An ad type shown in the post flow's picker (`MarketplaceCategoryResource`). */
export interface MarketplaceCategory {
  slug: string;
  name: string;
  icon: string | null;
  is_special: boolean;
  /** Present on the category *detail* (schema) endpoint; omitted from the list. */
  fields?: AttributeField[];
  /** The admin-defined form arrangement (detail endpoint only); null when using the default order. */
  layout?: PublicFormLayout | null;
}

/** The category an ad belongs to, as embedded on an ad (`MarketplaceAdResource.category`). */
export interface AdCategory {
  slug: string;
  name: string;
  icon: string | null;
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
  category?: AdCategory | null;
  attributes?: AdAttributes;
  location: AdLocation;
  contact_method: ContactMethod;
  /** Whether a number/email exists to reveal — the value itself is only returned to the owner. */
  has_contact_value?: boolean;
  /** Present only for the owner's own ad (to edit it); revealed to others via the contact endpoint. */
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
