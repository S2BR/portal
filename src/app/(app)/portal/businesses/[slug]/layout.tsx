import type { ReactNode } from "react";

import { CompanySidebar } from "@/components/business/company-sidebar";
import { CompanyWorkspace } from "@/components/business/company-workspace";

/**
 * The company workspace: a company-scoped sidebar (switcher + Dashboard / Manage / Offerings) beside
 * the page content. The layout persists across the company's sub-pages, so the sidebar and switcher
 * never refetch or reload as you navigate between them.
 */
export default async function CompanyLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <CompanyWorkspace slug={slug}>
      {/* Break out of the app shell's centered, padded main so the sidebar sits flush at the
          viewport's left edge (Filament-style); the content to its right stays capped. */}
      <div className="-mt-10 mx-[calc(50%_-_50vw)] w-screen">
        <div className="flex flex-col sm:flex-row">
          <CompanySidebar slug={slug} />
          <div className="min-w-0 flex-1 px-4 py-10 sm:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </div>
        </div>
      </div>
    </CompanyWorkspace>
  );
}
