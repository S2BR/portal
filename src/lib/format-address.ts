import addressFormatter from "@fragaria/address-formatter";

import type { BusinessAddress } from "@/app/api/businesses/route";

/**
 * The subset of `@fragaria/address-formatter` input components we populate from
 * a {@link BusinessAddress}.
 */
type AddressComponents = {
  house?: string;
  road?: string;
  neighbourhood?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  countryCode?: string;
};

/**
 * Country-specific component adjustments applied *before* the worldwide
 * OpenCage/OSM templates run, for local conventions those templates don't
 * encode. Keyed by ISO 3166-1 alpha-2 code — expanding to a new country is a
 * single entry here (or none at all, if the generic template already suffices).
 */
const countryComponentRules: Record<
  string,
  (components: AddressComponents) => AddressComponents
> = {
  /**
   * Canada Post joins the unit and civic number on the street line as
   * "Unit-Civic Street" (e.g. "503-7407 Av Mountain Sights") rather than
   * placing the unit on its own line.
   */
  CA: (components) => {
    if (components.house && components.road) {
      return {
        ...components,
        house: undefined,
        road: `${components.house}-${components.road}`,
      };
    }

    return components;
  },
};

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
 * OpenCage/OSM templates (line order, state/postcode arrangement, joins),
 * plus any {@link countryComponentRules} for that country. The stored
 * `country` is an ISO 3166-1 alpha-2 code, which both selects the template and
 * yields a localized country name for the final line.
 *
 * @returns One string per output line, ready to render as stacked spans.
 */
export function formatBusinessAddress(
  address: BusinessAddress,
  locale: string,
): string[] {
  const countryCode = address.country?.trim().toUpperCase() || undefined;

  const baseComponents: AddressComponents = {
    house: address.apartment_suite ?? undefined,
    road: address.address_1 || undefined,
    neighbourhood: address.address_2 ?? undefined,
    city: address.city || undefined,
    state: address.state_province ?? undefined,
    postcode: address.postal_code ?? undefined,
    countryCode,
    country: countryCode ? regionName(countryCode, locale) : undefined,
  };

  const applyCountryRule = countryCode
    ? countryComponentRules[countryCode]
    : undefined;
  const components = applyCountryRule
    ? applyCountryRule(baseComponents)
    : baseComponents;

  return addressFormatter
    .format(components, { appendCountry: true, output: "array" })
    .map((line) => line.trim())
    .filter(Boolean);
}
