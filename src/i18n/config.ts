export const locales = [
  "en",
  "es",
  "fr-CA",
  "pt-BR",
  "ja",
  "it",
  "de",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that persists the user's chosen locale. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Autonyms — each language is shown in its own language in the switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "fr-CA": "Français (Canada)",
  "pt-BR": "Português (Brasil)",
  ja: "日本語",
  it: "Italiano",
  de: "Deutsch",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}

/**
 * The portal API identifies locales with underscores (`en`, `es`, `fr_CA`,
 * `pt_BR`), while the web app uses valid Unicode/BCP-47 tags (`fr-CA`, `pt-BR`)
 * so `Intl` and next-intl accept them. Convert only at the API boundary
 * (Accept-Language, locale params).
 */
export function toApiLocale(locale: Locale): string {
  return locale.replace("-", "_");
}

/**
 * Right-to-left locales. None of the current set are RTL, but the layout, primitives, and
 * logical CSS are all direction-driven — add an RTL locale here (e.g. `ar`, `he`, `fa`) and
 * the whole UI mirrors with no further changes. A dev-only toggle can force RTL meanwhile.
 */
export const rtlLocales: readonly string[] = [];

export type Direction = "ltr" | "rtl";

export function getDirection(locale: string): Direction {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

/** Cookie that persists the user's chosen text direction, overriding the locale default. */
export const DIRECTION_COOKIE = "direction";

export function isDirection(value: unknown): value is Direction {
  return value === "ltr" || value === "rtl";
}
