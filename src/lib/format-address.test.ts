import { describe, expect, it } from "vitest";

import type { BusinessAddress } from "@/app/api/businesses/route";

import { formatBusinessAddress } from "./format-address";

const address = (overrides: Partial<BusinessAddress>): BusinessAddress => ({
  id: "addr-1",
  address_1: "",
  address_2: null,
  apartment_suite: null,
  city: "",
  state_province: null,
  postal_code: null,
  country: "",
  latitude: null,
  longitude: null,
  timezone: null,
  notes: null,
  is_main: true,
  is_hidden: false,
  ...overrides,
});

describe("formatBusinessAddress", () => {
  it("lays out a US address with the country name localized", () => {
    const lines = formatBusinessAddress(
      address({
        address_1: "1200 Market Street",
        apartment_suite: "Suite 400",
        city: "San Francisco",
        state_province: "CA",
        postal_code: "94103",
        country: "US",
      }),
      "en",
    );

    expect(lines).toEqual([
      "Suite 400",
      "1200 Market Street",
      "San Francisco, CA 94103",
      "United States of America",
    ]);
  });

  it("uses the Brazilian layout and a locale-specific country name", () => {
    const lines = formatBusinessAddress(
      address({
        address_1: "Rua Tunísia, 299",
        address_2: "Parque das Nações",
        city: "Piracicaba",
        state_province: "SP",
        postal_code: "13470-170",
        country: "BR",
      }),
      "pt-BR",
    );

    expect(lines).toContain("Piracicaba - SP");
    expect(lines).toContain("13470-170");
    expect(lines.at(-1)).toBe("Brasil");
  });

  it("joins the unit and civic number Canada Post style", () => {
    const lines = formatBusinessAddress(
      address({
        apartment_suite: "503",
        address_1: "7407 Av Mountain Sights",
        city: "Montreal",
        state_province: "QC",
        postal_code: "H4P 0B6",
        country: "CA",
      }),
      "en",
    );

    expect(lines).toContain("503-7407 Av Mountain Sights");
    // The unit must not appear on its own line.
    expect(lines).not.toContain("503");
    expect(lines).toContain("Montreal, QC H4P 0B6");
  });

  it("accepts a lowercase country code", () => {
    const lines = formatBusinessAddress(
      address({
        address_1: "7407 Av Mountain Sights",
        apartment_suite: "503",
        city: "Montreal",
        state_province: "QC",
        postal_code: "H4P 0B6",
        country: "ca",
      }),
      "en",
    );

    expect(lines).toContain("503-7407 Av Mountain Sights");
  });
});
