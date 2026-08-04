import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { LegalFallbackNotice } from "@/components/legal-fallback-notice";
import { Markdown } from "@/components/markdown";
import { loadLegal } from "@/lib/legal";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("legal");
  return { title: t("terms") };
}

export default async function TermsPage() {
  const locale = await getLocale();
  const { content, inEnglishFallback } = await loadLegal("terms", locale);

  return (
    <article>
      {inEnglishFallback ? <LegalFallbackNotice /> : null}
      <Markdown>{content}</Markdown>
    </article>
  );
}
