import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";

import { BusinessCatalog } from "@/components/business/public/business-catalog";
import {
  getPublicBusiness,
  getPublicBusinessProducts,
} from "@/lib/public-business";
import { businessPagesRobots } from "@/lib/seo";

// Memoize per request so generateMetadata and the page share one API call.
const loadBusiness = cache(getPublicBusiness);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await loadBusiness(slug);

  if (!business) {
    return {};
  }

  const t = await getTranslations("businesses.public");

  return {
    title: `${business.name} · ${t("products")}`,
    robots: businessPagesRobots,
    alternates: { canonical: `/businesses/${business.slug}/products` },
  };
}

/**
 * A business's FULL public product catalog, grouped by its sections — server-rendered, no login. A
 * slug that isn't published/visible 404s; a stale-name slug redirects to the canonical.
 */
export default async function BusinessProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await loadBusiness(slug);

  if (!business) {
    notFound();
  }

  if (business.slug !== slug) {
    redirect(`/businesses/${business.slug}/products`);
  }

  const [locale, catalog, t] = await Promise.all([
    getLocale(),
    getPublicBusinessProducts(business.slug),
    getTranslations("businesses.public"),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <Link
        href={`/businesses/${business.slug}`}
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {business.name}
      </Link>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("products")}
      </h1>

      {catalog.products.length === 0 ? (
        <p className="text-muted-foreground mt-6 text-sm">{t("noProducts")}</p>
      ) : (
        <div className="mt-6">
          <BusinessCatalog
            products={catalog.products}
            sections={catalog.sections}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
