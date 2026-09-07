import { notFound } from "next/navigation";

import { BusinessHeader } from "@/components/business/public/business-header";
import { BusinessTabs } from "@/components/business/public/business-tabs";
import { getCachedPublicBusiness } from "@/lib/public-business";

/**
 * The shared shell for a business's public surfaces (Overview / Products / Reviews). The header and the
 * tab strip live HERE, so navigating between the tabs never remounts them — only the page body below
 * swaps. That's the "seamless" feel: the banner, logo, identity, and actions stay put, the reader never
 * feels they left the business.
 *
 * The layout only 404s an unknown/unpublished slug. Each page still resolves the business itself (one
 * cached call, shared) to fetch its own data AND redirect a stale-name slug to the canonical URL while
 * preserving its sub-path.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = await getCachedPublicBusiness(slug);

  if (!business) {
    notFound();
  }

  return (
    <>
      <BusinessHeader business={business} />
      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6">
        <BusinessTabs slug={business.slug} />
        {/* Extra bottom space on mobile clears the header's fixed action bar. */}
        <div className="pt-8 pb-24 sm:pb-16">{children}</div>
      </div>
    </>
  );
}
