import { describe, expect, it } from "vitest";

import { negotiateLocale } from "./resolve";

describe("negotiateLocale", () => {
  it("defaults to English when there is no usable header", () => {
    expect(negotiateLocale(null)).toBe("en");
    expect(negotiateLocale("")).toBe("en");
    expect(negotiateLocale("*")).toBe("en");
  });

  it("matches an exact supported tag", () => {
    expect(negotiateLocale("pt-BR")).toBe("pt-BR");
    expect(negotiateLocale("fr-CA,en;q=0.8")).toBe("fr-CA");
  });

  it("matches by language prefix (regional variants)", () => {
    expect(negotiateLocale("pt-PT")).toBe("pt-BR");
    expect(negotiateLocale("fr-FR,en;q=0.9")).toBe("fr-CA");
    expect(negotiateLocale("es-MX")).toBe("es");
    expect(negotiateLocale("en-US")).toBe("en");
  });

  it("falls back to English for an unsupported language", () => {
    expect(negotiateLocale("xx-XX,zz;q=0.7")).toBe("en");
  });

  it("matches Japanese when the browser prefers it", () => {
    expect(negotiateLocale("xx-XX,ja;q=0.7")).toBe("ja");
  });

  it("takes the first matching segment in the browser's order", () => {
    expect(negotiateLocale("xx,pt-BR;q=0.9,en;q=0.8")).toBe("pt-BR");
  });
});
