/**
 * Shared types + helpers for the taxonomy admin (categories & amenities). Node names/descriptions
 * are locale-keyed maps using the API's locale codes (underscore form, e.g. `fr_CA`), which is the
 * single set the operator edits regardless of the UI language.
 */

export const TAXONOMY_LOCALES = [
  "en",
  "es",
  "fr_CA",
  "pt_BR",
  "ja",
  "it",
  "de",
  "ar",
] as const;

export type TaxonomyLocale = (typeof TAXONOMY_LOCALES)[number];

/** A locale-keyed translatable value (may be partial; the default locale `en` is always required). */
export type LocaleText = Partial<Record<TaxonomyLocale, string>>;

/** Short label for each locale tab in the editor. */
export const TAXONOMY_LOCALE_LABEL: Record<TaxonomyLocale, string> = {
  en: "EN",
  es: "ES",
  fr_CA: "FR-CA",
  pt_BR: "PT-BR",
  ja: "JA",
  it: "IT",
  de: "DE",
  ar: "AR",
};

export interface AdminCategory {
  id: number;
  name: LocaleText;
  slug: string;
  parent_id: number | null;
  order_column: number;
  activated_at: string | null;
  is_active: boolean;
  usage_count: number;
  children?: AdminCategory[];
}

export interface AdminAmenity {
  id: number;
  name: LocaleText;
  description: LocaleText | null;
  slug: string;
  parent_id: number | null;
  order_column: number;
  activated_at: string | null;
  is_active: boolean;
  usage_count: number;
  /** The categories this node is scoped to; empty = global. Group-level and amenity-level. */
  category_ids?: number[];
  children?: AdminAmenity[];
}

/** A tree node of either kind — the shared shape the tree editor renders. */
export type TaxonomyNode = AdminCategory | AdminAmenity;

/** Resolve a display name in the UI locale, falling back to English then any present value. */
export function displayName(name: LocaleText, uiLocale: string): string {
  const key = uiLocale.replace("-", "_") as TaxonomyLocale;
  return name[key] ?? name.en ?? Object.values(name).find(Boolean) ?? "—";
}
