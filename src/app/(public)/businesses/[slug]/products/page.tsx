import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { BusinessCatalog } from "@/components/business/public/business-catalog";
import {
  getCachedPublicBusiness as loadBusiness,
  getPublicBusinessProducts,
} from "@/lib/public-business";
import { businessPagesRobots } from "@/lib/seo";

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
    <section aria-label={t("products")}>
      {catalog.products.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noProducts")}</p>
      ) : (
        <BusinessCatalog
          products={catalog.products}
          sections={catalog.sections}
          locale={locale}
        />
      )}
    </section>
  );
}
