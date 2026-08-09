import type { ReactNode } from "react";

import { BusinessSidebar } from "@/components/business/business-sidebar";
import { BusinessWorkspace } from "@/components/business/business-workspace";

/**
 * The business workspace: a business-scoped sidebar (switcher + Dashboard / Manage / Offerings) beside
 * the page content. The layout persists across the business's sub-pages, so the sidebar and switcher
 * never refetch or reload as you navigate between them.
 */
export default async function BusinessLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    // Break out of the app shell's centered, padded main so the sidebar sits flush at the viewport's
    // left edge (Filament-style); the content to its right stays capped. The sidebar loads its own
    // data, so it renders immediately — only the content area waits on the access check.
    <div className="mx-[calc(50%_-_50vw)] -mt-10 w-screen">
      <div className="flex flex-col sm:flex-row">
        <BusinessSidebar slug={slug} />
        <div className="min-w-0 flex-1 px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-7xl">
            <BusinessWorkspace slug={slug}>{children}</BusinessWorkspace>
          </div>
        </div>
      </div>
    </div>
  );
}
