import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { NewAdFlow } from "@/components/marketplace/new-ad-flow";
import { getMarketplaceCategories } from "@/lib/marketplace/data";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace");
  return { title: t("new.title") };
}

/** Post a new marketplace ad — pick a type (the bloom picker), then fill its form. */
export default async function NewAdPage() {
  const t = await getTranslations("marketplace");
  const categories = await getMarketplaceCategories();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("new.title")}
        </h1>
        <p className="text-muted-foreground">{t("new.subtitle")}</p>
      </div>
      <NewAdFlow categories={categories} />
    </div>
  );
}
