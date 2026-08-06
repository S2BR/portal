import "server-only";

import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from "./config";

/**
 * The best supported locale for a browser `Accept-Language` header: an exact tag match first
 * (`fr-CA`, `pt-BR`), then a language-prefix match (`fr` → `fr-CA`, `en-US` → `en`), and finally
 * the default (`en`) when nothing matches. Header segments are taken in the browser's stated
 * order of preference.
 */
export function negotiateLocale(header: string | null): Locale {
  if (!header) {
    return defaultLocale;
  }

  for (const segment of header.split(",")) {
    const tag = segment.split(";")[0]?.trim();
    if (!tag) {
      continue;
    }
    if (isLocale(tag)) {
      return tag;
    }
    const language = tag.split("-")[0];
    const match = locales.find((locale) => locale.split("-")[0] === language);
    if (match) {
      return match;
    }
  }

  return defaultLocale;
}

/**
 * The active locale for the current request — the single source of truth shared by the UI
 * (next-intl) and the API forwarding (BFF `Accept-Language`). The user's explicitly chosen
 * language (persisted in {@link LOCALE_COOKIE}) always wins; otherwise it's negotiated from the
 * browser, defaulting to English.
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }
  return negotiateLocale((await headers()).get("accept-language"));
}
