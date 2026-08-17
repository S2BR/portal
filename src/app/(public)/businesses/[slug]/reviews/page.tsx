import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cache } from "react";

import { BusinessLogo } from "@/components/business/business-logo";
import { BusinessReviews } from "@/components/business/public/business-reviews";
import { getPublicBusiness, getPublicReviews } from "@/lib/public-business";
import { businessPagesRobots } from "@/lib/seo";

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
    <div className="mx-auto w-full max-w-[90rem] px-4 py-8 sm:px-6">
      <Link
        href={`/businesses/${business.slug}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToProfile")}
      </Link>

      <header className="mt-4 mb-8 flex items-center gap-4">
        <BusinessLogo
          name={business.name}
          src={business.logo}
          className="size-14 rounded-2xl"
          fallbackClassName="text-lg"
        />
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {business.name}
          </h1>
          <p className="text-muted-foreground text-sm">{t("title")}</p>
        </div>
      </header>

      <BusinessReviews slug={business.slug} initial={reviews} />
    </div>
  );
}
