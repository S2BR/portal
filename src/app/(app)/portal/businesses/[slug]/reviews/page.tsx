import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { OwnerReviews } from "@/components/business/owner-reviews";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.workspace.nav");
  return { title: t("reviews") };
}

/**
 * The owner's reviews surface — every review on their business (hidden ones included), with report
 * flags, where they post one public reply per review. Resolves by slug through the BFF; a slug the
 * user doesn't own renders an empty state.
 */
export default async function BusinessReviewsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <OwnerReviews slug={slug} />;
}
