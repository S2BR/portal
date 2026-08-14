import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Directory } from "@/components/business/public/directory";
import {
  getPublicAmenities,
  getPublicCategories,
  taxonomyLabels,
} from "@/lib/public-business";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.directory");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/businesses" },
  };
}

/**
 * The public business directory. A light server shell (header + SEO + the facet LABEL maps) that hands
 * off to the client `Directory`, which searches Typesense directly (InstantSearch). The facet values
 * in the index are slugs/enums; the maps here turn them into localized labels.
 */
export default async function DirectoryPage() {
  const t = await getTranslations("businesses.directory");
  const types = await getTranslations("businessNew.types");

  const [categories, amenities] = await Promise.all([
    getPublicCategories(),
    getPublicAmenities(),
  ]);

  const labels = {
    categories: taxonomyLabels(categories),
    amenities: taxonomyLabels(amenities),
    types: {
      company: types("company.title"),
      self_employed: types("selfEmployed.title"),
    },
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </header>
      <Directory labels={labels} />
    </div>
  );
}
