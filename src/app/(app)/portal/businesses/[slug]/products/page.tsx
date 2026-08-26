import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OwnerProducts } from "@/components/business/products/owner-products";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.workspace.nav");
  return { title: t("products") };
}

/** The business's product catalog — its sightings (products it carries, with prices). */
export default async function BusinessProductsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <OwnerProducts businessSlug={slug} />;
}
