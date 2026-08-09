import type { ReactNode } from "react";

import { CompanySidebar } from "@/components/business/company-sidebar";

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
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
      <CompanySidebar slug={slug} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
