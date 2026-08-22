import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Directory } from "@/components/business/public/directory";
import { getEdgeLocation } from "@/lib/edge-location";
import { businessPagesRobots } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.directory");
  return {
    title: t("title"),
    description: t("subtitle"),
    alternates: { canonical: "/businesses" },
    robots: businessPagesRobots,
  };
}

/**
 * The public business directory. A light server shell (header + SEO + the edge-guess location) that
 * hands off to the client `Directory`, which searches Typesense DIRECTLY (InstantSearch) AND loads
 * the category/amenity facet labels straight from Typesense — nothing here touches the database. The
 * only server-provided labels are the business `type` enum, which is translation copy, not taxonomy.
 */
export default async function DirectoryPage() {
  const t = await getTranslations("businesses.directory");
  const types = await getTranslations("businessNew.types");

  const ipLocation = await getEdgeLocation();

  const typeLabels = {
    company: types("company.title"),
    self_employed: types("selfEmployed.title"),
  };

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      </header>
      <Directory typeLabels={typeLabels} ipLocation={ipLocation} />
    </div>
  );
}
