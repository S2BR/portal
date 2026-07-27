export const locales = ["en", "es", "fr_CA", "pt_BR"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** Cookie that persists the user's chosen locale. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Autonyms — each language is shown in its own language in the switcher. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr_CA: "Français (Canada)",
  pt_BR: "Português (Brasil)",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}
