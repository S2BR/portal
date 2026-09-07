import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { BusinessReviews } from "@/components/business/public/business-reviews";
import {
  getCachedPublicBusiness as loadBusiness,
  getPublicReviews,
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

  const t = await getTranslations("businesses.public.reviews");

  return {
    title: `${t("title")} · ${business.name}`,
    robots: businessPagesRobots,
    alternates: { canonical: `/businesses/${business.slug}/reviews` },
  };
}

/**
 * A business's dedicated PUBLIC reviews page — the write-a-review block, the rating breakdown, and
 * the full, filterable/sortable list, kept off the profile so it stays uncluttered. A stale-name
 * slug self-heals to the canonical URL; an unpublished business 404s.
 */
export default async function BusinessReviewsPage({
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
    redirect(`/businesses/${business.slug}/reviews`);
  }

  const t = await getTranslations("businesses.public.reviews");
  const reviews = await getPublicReviews(business.slug);

  return (
    <section aria-label={t("title")}>
      <BusinessReviews slug={business.slug} initial={reviews} />
    </section>
  );
}
