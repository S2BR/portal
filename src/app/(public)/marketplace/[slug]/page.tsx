import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdDetail } from "@/components/marketplace/ad-detail";
import { getCachedPublicAd } from "@/lib/marketplace/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ad = await getCachedPublicAd(slug);
  if (!ad) {
    return {};
  }
  return {
    title: ad.title,
    description: ad.description.slice(0, 160),
    alternates: { canonical: `/marketplace/${ad.slug}` },
  };
}

/** A public marketplace ad's detail page. 404s when the ad isn't publicly listed; self-heals the slug. */
export default async function AdPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ad = await getCachedPublicAd(slug);

  if (!ad) {
    notFound();
  }
  if (ad.slug !== slug) {
    redirect(`/marketplace/${ad.slug}`);
  }

  return (
    <div className="mx-auto w-full max-w-[90rem] px-4 pt-8 pb-24 sm:px-6 sm:pb-16">
      <AdDetail ad={ad} />
    </div>
  );
}
