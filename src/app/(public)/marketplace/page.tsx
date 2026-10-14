import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MarketplaceBrowse } from "@/components/marketplace/marketplace-browse";
import { getPublicAds } from "@/lib/marketplace/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace");
  return {
    title: t("browse.title"),
    description: t("browse.subtitle"),
    alternates: { canonical: "/marketplace" },
  };
}

/**
 * The public marketplace (classifieds) directory. A light server shell that fetches the first page and
 * hands off to the client {@link MarketplaceBrowse} for search + load-more.
 */
export default async function MarketplacePage() {
  const t = await getTranslations("marketplace");
  const initial = await getPublicAds({});

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t("browse.title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("browse.subtitle")}</p>
      </header>
      <MarketplaceBrowse initial={initial} />
    </div>
  );
}
