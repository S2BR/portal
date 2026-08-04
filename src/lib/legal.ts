import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type LegalDoc = "terms" | "privacy";

const LEGAL_DIR = path.join(process.cwd(), "src/content/legal");

/**
 * Load a legal document's markdown for a locale. English is the canonical source: when a
 * locale-specific file doesn't exist yet, we fall back to English and flag it so the page can
 * show a notice. Legal copy must be authored/reviewed per locale — never machine-translated.
 */
export async function loadLegal(
  doc: LegalDoc,
  locale: string,
): Promise<{ content: string; inEnglishFallback: boolean }> {
  const candidates = locale === "en" ? ["en"] : [locale, "en"];
  for (const candidate of candidates) {
    try {
      const content = await readFile(
        path.join(LEGAL_DIR, `${doc}.${candidate}.md`),
        "utf8",
      );
      return {
        content,
        inEnglishFallback: candidate === "en" && locale !== "en",
      };
    } catch {
      // Try the next candidate.
    }
  }
  return { content: "", inEnglishFallback: false };
}
