import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  locales,
  type Locale,
} from "./config";

/** Map a browser `Accept-Language` header to one of our supported locales. */
function negotiateLocale(header: string | null): Locale {
  if (!header) {
    return defaultLocale;
  }

  for (const segment of header.split(",")) {
    const tag = segment.split(";")[0]?.trim().replace("-", "_");
    if (!tag) {
      continue;
    }
    if (isLocale(tag)) {
      return tag;
    }
    const language = tag.split("_")[0];
    const match = locales.find((locale) => locale.split("_")[0] === language);
    if (match) {
      return match;
    }
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;

  const locale = isLocale(cookieLocale)
    ? cookieLocale
    : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
