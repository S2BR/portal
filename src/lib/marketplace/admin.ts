/**
 * Shared types + helpers for the marketplace schema admin (categories & fields). Names/labels are
 * locale-keyed maps using the API's locale codes. v1 of the editor edits only the default locale
 * (`en`); the stored map keeps any other languages the API already holds.
 */

export const DEFAULT_LOCALE = "en";

/** A locale-keyed translatable value. */
export type LocaleMap = Record<string, string>;

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

export interface AdminCategory {
  id: number;
  name: LocaleMap;
  slug: string;
  icon: string | null;
  is_special: boolean;
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
