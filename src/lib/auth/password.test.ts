import { describe, expect, it } from "vitest";

import { checkPassword } from "./password";

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
