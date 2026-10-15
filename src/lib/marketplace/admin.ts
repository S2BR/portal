/**
 * Shared types + helpers for the marketplace schema admin (categories & fields). Names/labels are
 * locale-keyed maps using the API's locale codes. v1 of the editor edits only the default locale
 * (`en`); the stored map keeps any other languages the API already holds.
 */

import type { FieldWidth } from "@/lib/marketplace/layout";

export const DEFAULT_LOCALE = "en";

/**
 * The locales the API stores translations for, in editing order. Keys are the API's locale codes
 * (underscored, e.g. `pt_BR`); the short label is what the editor's locale switcher shows.
 */
export const LOCALES: { key: string; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "es", label: "ES" },
  { key: "fr_CA", label: "FR" },
  { key: "pt_BR", label: "PT" },
  { key: "ja", label: "JA" },
  { key: "it", label: "IT" },
  { key: "de", label: "DE" },
  { key: "ar", label: "AR" },
];

/** A locale-keyed translatable value. */
export type LocaleMap = Record<string, string>;

/** Strip empty/whitespace values from a locale map (the API keeps only supported, non-empty keys). */
export function cleanLocaleMap(map: LocaleMap): LocaleMap {
  const out: LocaleMap = {};
  for (const [locale, value] of Object.entries(map)) {
    if (value.trim() !== "") {
      out[locale] = value.trim();
    }
  }
  return out;
}

export type AttributeType =
  "select" | "multiselect" | "number" | "boolean" | "date" | "text";

export const ATTRIBUTE_TYPES: AttributeType[] = [
  "text",
  "number",
  "boolean",
  "select",
  "multiselect",
  "date",
];

/** Whether a field type draws its allowed values from an options list. */
export function typeHasOptions(type: AttributeType): boolean {
  return type === "select" || type === "multiselect";
}

/** One placed field in the admin form-layout builder (section name is a full locale map, unlike the public shape). */
export interface AdminLayoutItem {
  kind: "core" | "attribute";
  key: string;
  width: FieldWidth;
}

export interface AdminLayoutSection {
  id: string;
  name: LocaleMap;
  items: AdminLayoutItem[];
}

export interface AdminFormLayout {
  sections: AdminLayoutSection[];
}

export interface AdminCategory {
  id: number;
  name: LocaleMap;
  slug: string;
  icon: string | null;
  is_special: boolean;
  /** The admin-defined form arrangement, raw (full locale maps). Null when using the default order. */
  form_layout?: AdminFormLayout | null;
  order_column: number;
  activated_at: string | null;
  is_active: boolean;
  fields_count?: number;
}

export interface AdminFieldOption {
  value: string;
  label: LocaleMap;
}

export interface AdminField {
  id: number;
  key: string;
  label: LocaleMap;
  type: AttributeType;
  options: AdminFieldOption[];
  unit: string | null;
  required: boolean;
  filterable: boolean;
  order_column: number;
  group_id: number | null;
  is_live: boolean;
  deprecated_at: string | null;
}

/** Read a locale map as a single string (default locale, else the first present). */
export function readText(map: LocaleMap | null | undefined): string {
  if (!map) {
    return "";
  }
  return map[DEFAULT_LOCALE] ?? Object.values(map)[0] ?? "";
}

/** Wrap a single-locale edit back into a locale map for the API. */
export function localeText(value: string): LocaleMap {
  return { [DEFAULT_LOCALE]: value };
}
