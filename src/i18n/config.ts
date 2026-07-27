export const locales = ["en", "es", "fr-CA", "pt-BR"] as const;

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
