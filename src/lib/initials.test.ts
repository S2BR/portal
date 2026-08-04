import { describe, expect, it } from "vitest";

import { initialsFromName } from "./initials";

describe("initialsFromName", () => {
  it("takes first + last word initials", () => {
    expect(initialsFromName("Israel Pereira")).toBe("IP");
    expect(initialsFromName("Ada Countess of Lovelace")).toBe("AL");
  });

  it("uses the first two letters for a single word", () => {
    expect(initialsFromName("Madonna")).toBe("MA");
  });

  it("trims and collapses whitespace", () => {
    expect(initialsFromName("  israel   pereira  ")).toBe("IP");
  });

  it("falls back to ? for an empty name", () => {
    expect(initialsFromName("   ")).toBe("?");
  });
});
