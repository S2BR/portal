import addressFormatter from "@fragaria/address-formatter";

import type { BusinessAddress } from "@/app/api/businesses/route";

/**
 * Resolve an ISO 3166-1 alpha-2 country code to its name in the given locale
 * (e.g. `"CA"` → "Canada" / "Canadá"), falling back to the raw code.
 */
function regionName(countryCode: string, locale: string): string {
  try {
    return (
      new Intl.DisplayNames([locale], { type: "region" }).of(countryCode) ??
      countryCode
    );
  } catch {
    return countryCode;
  }
}

/**
 * Format a business address into country-correct lines using the worldwide
 * OpenCage/OSM templates (line order, state/postcode arrangement, joins). The
 * stored `country` is an ISO 3166-1 alpha-2 code, which both selects the
 * template and yields a localized country name for the final line.
 *
 * @returns One string per output line, ready to render as stacked spans.
 */
export function formatBusinessAddress(
  address: BusinessAddress,
  locale: string,
): string[] {
  const countryCode = address.country?.trim().toUpperCase() || undefined;

  return addressFormatter.format(
    {
      house: address.apartment_suite ?? undefined,
      road: address.address_1,
      neighbourhood: address.address_2 ?? undefined,
      city: address.city,
      state: address.state_province ?? undefined,
      postcode: address.postal_code ?? undefined,
      countryCode,
      country: countryCode ? regionName(countryCode, locale) : undefined,
    },
    { appendCountry: true, output: "array" },
  )
    .map((line) => line.trim())
    .filter(Boolean);
}
