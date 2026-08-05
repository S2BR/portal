import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BusinessDetail } from "@/components/business/business-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses");
  return { title: t("title") };
}

/**
 * A single business the signed-in user owns — view its details, edit them inline, or delete it.
 * The component resolves the business by slug through the BFF; a slug the user doesn't own
 * renders a "not found" state.
 */
export default async function BusinessDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BusinessDetail slug={slug} />;
}
