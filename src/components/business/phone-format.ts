import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
  type CountryCode,
} from "libphonenumber-js";

import type { ComboboxOption } from "@/components/ui/combobox";

/** ISO 3166-1 alpha-2 (e.g. "CA") → its 🇨🇦 regional-indicator flag emoji. "" for a bad code. */
export function flagEmoji(country: string): string {
  if (country.length !== 2) {
    return "";
  }
  return String.fromCodePoint(
    ...country
      .toUpperCase()
      .split("")
      .map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

/**
 * Format a stored E.164 number for display, e.g. "+1 416 555 1234". The `country` disambiguates
 * shared dial codes (a +1 number is Canadian or American); falls back to the raw value if the
 * number can't be parsed (e.g. a legacy free-text entry).
 */
export function formatPhone(value: string, country?: string): string {
  try {
    return parsePhoneNumber(
      value,
      country as CountryCode | undefined,
    ).formatInternational();
  } catch {
    return value;
  }
}

/** National format for the edit box, e.g. "(416) 555-1234". Falls back to the raw value. */
export function nationalPhone(value: string, country?: string): string {
  try {
    return parsePhoneNumber(
      value,
      country as CountryCode | undefined,
    ).formatNational();
  } catch {
    return value;
  }
}

/** Parse typed input to a canonical E.164 string ("+14165551234"), or null while incomplete. */
export function toE164(input: string, country?: string): string | null {
  try {
    const parsed = parsePhoneNumber(input, country as CountryCode | undefined);
    // isPossible (right length/shape), not isValid — the latter rejects reserved test exchanges
    // like 555 and would refuse otherwise-fine numbers.
    return parsed.isPossible() ? parsed.number : null;
  } catch {
    return null;
  }
}

/**
 * Every dialable country as a searchable combobox option — "🇨🇦 Canada +1" — with names localized
 * to `locale` (via Intl.DisplayNames) and sorted by name. Built from libphonenumber's own data, so
 * there's no country list to maintain.
 */
export function countryOptions(locale: string): ComboboxOption[] {
  const names = new Intl.DisplayNames([locale], { type: "region" });
  return getCountries()
    .map((country) => ({ country, name: names.of(country) ?? country }))
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map(({ country, name }) => ({
      value: country,
      label: `${flagEmoji(country)} ${name} +${getCountryCallingCode(country)}`,
    }));
}
