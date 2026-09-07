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
    // `overflow-x-clip` (not `hidden`, which would break the sticky bars) contains the edge-to-edge
    // bars' full-bleed width so it never spills into a horizontal scrollbar.
    <div className="overflow-x-clip">
      <BusinessHeader business={business} />
      {/* Full-width, edge-to-edge sticky bar; its inner content aligns to the content container. */}
      <BusinessTabs
        slug={business.slug}
        name={business.name}
        logo={business.logo}
      />
      {/* Extra bottom space on mobile clears the header's fixed action bar. */}
      <div className="mx-auto w-full max-w-[90rem] px-4 pt-8 pb-24 sm:px-6 sm:pb-16">
        {children}
      </div>
    </div>
  );
}
