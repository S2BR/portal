import { describe, expect, it } from "vitest";

import {
  countryOptions,
  flagEmoji,
  formatPhone,
  nationalPhone,
  toE164,
} from "@/components/business/phone-format";

describe("formatPhone", () => {
  it("formats an E.164 number internationally", () => {
    expect(formatPhone("+14165551234", "CA")).toBe("+1 416 555 1234");
  });

  it("formats the same +1 number whether it's tagged CA or US", () => {
    // The country still matters — it's what keeps a Canadian number from *reading* as US
    // elsewhere (flag, national format) — but the international display is identical.
    expect(formatPhone("+14165551234", "US")).toBe(
      formatPhone("+14165551234", "CA"),
    );
  });

  it("falls back to the raw value when it can't be parsed", () => {
    expect(formatPhone("not a phone")).toBe("not a phone");
  });
});

describe("nationalPhone", () => {
  it("formats an E.164 number nationally for editing", () => {
    expect(nationalPhone("+14165551234", "CA")).toBe("(416) 555-1234");
  });
});

describe("toE164", () => {
  it("canonicalizes typed national input using the country", () => {
    expect(toE164("(416) 555-1234", "CA")).toBe("+14165551234");
  });

  it("returns null for an incomplete number", () => {
    expect(toE164("416", "CA")).toBeNull();
  });
});

describe("flagEmoji", () => {
  it("maps an ISO-2 code to its flag", () => {
    expect(flagEmoji("CA")).toBe("🇨🇦");
    expect(flagEmoji("BR")).toBe("🇧🇷");
  });

  it("returns empty for a bad code", () => {
    expect(flagEmoji("XYZ")).toBe("");
  });
});

describe("countryOptions", () => {
  it("lists dialable countries with localized name + dial code", () => {
    const options = countryOptions("en");
    const canada = options.find((option) => option.value === "CA");
    expect(canada?.label).toBe("🇨🇦 Canada +1");
    expect(options.length).toBeGreaterThan(200);
  });
});
