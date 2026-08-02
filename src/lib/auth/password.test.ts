import { describe, expect, it } from "vitest";

import { checkPassword, passwordRequirements } from "./password";

const strictPolicy = {
  min: 10,
  mixed_case: true,
  numbers: true,
  symbols: true,
};

describe("checkPassword", () => {
  it("accepts a password that satisfies the policy", () => {
    expect(checkPassword("Sup3rSecret!", strictPolicy)).toBeNull();
  });

  it("flags a too-short password", () => {
    expect(checkPassword("Ab1!", strictPolicy)).toBe("min");
  });

  it("flags a password without mixed case", () => {
    expect(checkPassword("sup3rsecret!", strictPolicy)).toBe("mixed_case");
  });

  it("flags a password without a number", () => {
    expect(checkPassword("SuperSecret!!", strictPolicy)).toBe("numbers");
  });

  it("flags a password without a symbol", () => {
    expect(checkPassword("Sup3rSecretX", strictPolicy)).toBe("symbols");
  });

  it("respects a relaxed policy", () => {
    expect(
      checkPassword("abcdefghij", {
        min: 10,
        mixed_case: false,
        numbers: false,
        symbols: false,
      }),
    ).toBeNull();
  });
});

describe("passwordRequirements", () => {
  it("returns each active rule with its met state as the user types", () => {
    const requirements = passwordRequirements("Ab1", strictPolicy);

    expect(requirements.map((requirement) => requirement.rule)).toEqual([
      "min",
      "mixed_case",
      "numbers",
      "symbols",
    ]);
    expect(
      requirements.find((requirement) => requirement.rule === "min")?.met,
    ).toBe(false);
    expect(
      requirements.find((requirement) => requirement.rule === "mixed_case")
        ?.met,
    ).toBe(true);
    expect(
      requirements.find((requirement) => requirement.rule === "numbers")?.met,
    ).toBe(true);
    expect(
      requirements.find((requirement) => requirement.rule === "symbols")?.met,
    ).toBe(false);
  });

  it("omits rules the policy does not enable", () => {
    const requirements = passwordRequirements("anything", {
      min: 8,
      mixed_case: false,
      numbers: false,
      symbols: false,
    });

    expect(requirements.map((requirement) => requirement.rule)).toEqual([
      "min",
    ]);
  });

  it("marks every requirement met for a compliant password", () => {
    expect(
      passwordRequirements("Sup3rSecret!", strictPolicy).every(
        (requirement) => requirement.met,
      ),
    ).toBe(true);
  });
});
