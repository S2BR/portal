import { describe, expect, it } from "vitest";

import en from "@/messages/en.json";
import es from "@/messages/es.json";
import frCA from "@/messages/fr_CA.json";
import ptBR from "@/messages/pt_BR.json";

import { locales } from "./config";

type Messages = Record<string, unknown>;

function flattenKeys(messages: Messages, prefix = ""): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenKeys(value as Messages, path)
      : path;
  });
}

const catalogs: Record<string, Messages> = {
  en,
  es,
  fr_CA: frCA,
  pt_BR: ptBR,
};

describe("i18n message catalogs", () => {
  it("provides a catalog for every supported locale", () => {
    expect(Object.keys(catalogs).sort()).toEqual([...locales].sort());
  });

  const baseline = flattenKeys(en).sort();

  it.each(Object.entries(catalogs))(
    "'%s' has exactly the same keys as the 'en' baseline",
    (_locale, catalog) => {
      expect(flattenKeys(catalog).sort()).toEqual(baseline);
    },
  );
});
