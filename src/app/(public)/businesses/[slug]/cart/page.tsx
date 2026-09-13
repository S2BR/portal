import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { StoreCart } from "@/components/business/public/store-cart";
import { getCachedPublicBusiness as loadBusiness } from "@/lib/public-business";
import { businessPagesRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [business, t] = await Promise.all([
    loadBusiness(slug),
    getTranslations("businesses.cart"),
  ]);

  if (!business) {
    return {};
  }

  return {
    title: `${t("cart")} · ${business.name}`,
    robots: businessPagesRobots,
  };
}

/**
 * The store's full cart page. Only stores with e-commerce enabled have one; anything else 404s. The
 * cart itself (lines, totals, mutations) is read from the shared CartProvider mounted in the layout.
 */
export default async function BusinessCartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await loadBusiness(slug);

  if (!business || !business.is_commerce_enabled) {
    notFound();
  }

  if (business.slug !== slug) {
    redirect(`/businesses/${business.slug}/cart`);
  }

  return <StoreCart />;
}
