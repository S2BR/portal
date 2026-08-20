export const locales = [
  "en",
  "pt-BR",
  "es",
  "fr-CA",
  "it",
  "de",
  "ja",
  "ar",
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that persists the user's chosen locale. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Autonyms — each language is shown in its own language in the switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
  es: "Español",
  "fr-CA": "Français (Canada)",
  it: "Italiano",
  de: "Deutsch",
  ja: "日本語",
  ar: "العربية",
};

/** A short native greeting per language — the hero of each language card. */
export const localeGreetings: Record<Locale, string> = {
  en: "Hello",
  "pt-BR": "Olá",
  es: "Hola",
  "fr-CA": "Bonjour",
  it: "Ciao",
  de: "Hallo",
  ja: "こんにちは",
  ar: "مرحبا",
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
export const rtlLocales: readonly string[] = ["ar"];

export type Direction = "ltr" | "rtl";

export function getDirection(locale: string): Direction {
  return rtlLocales.includes(locale) ? "rtl" : "ltr";
}

/** Cookie that persists the user's chosen text direction, overriding the locale default. */
export const DIRECTION_COOKIE = "direction";

export function isDirection(value: unknown): value is Direction {
  return value === "ltr" || value === "rtl";
}
