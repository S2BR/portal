import { getTranslations } from "next-intl/server";

/** Shown above a legal document when a locale-specific version isn't available and we fell back to English. */
export async function LegalFallbackNotice() {
  const t = await getTranslations("legal");
  return (
    <p className="bg-muted text-muted-foreground mb-8 rounded-lg px-4 py-3 text-sm">
      {t("fallbackNotice")}
    </p>
  );
}
