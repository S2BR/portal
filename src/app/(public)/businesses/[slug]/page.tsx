import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { cache } from "react";

import { BusinessProfile } from "@/components/business/public/business-profile";
import { getPublicBusiness } from "@/lib/public-business";

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

  const description = business.headline ?? business.description ?? undefined;
  const image = business.banner ?? business.logo ?? undefined;

  return {
    title: business.name,
    description,
    alternates: { canonical: `/businesses/${business.slug}` },
    openGraph: {
      type: "website",
      title: business.name,
      description,
      url: `/businesses/${business.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: business.name,
      description,
    },
  };
}

/**
 * A business's PUBLIC profile page — server-rendered, no login. A slug that isn't published/visible
 * 404s; a stale-name slug resolves and redirects to the canonical `name-slug-<code>` (self-healing,
 * good for SEO).
 */
export default async function PublicBusinessPage({
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
    redirect(`/businesses/${business.slug}`);
  }

  const locale = await getLocale();

  return <BusinessProfile business={business} locale={locale} />;
}
