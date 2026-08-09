import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { CompanyDashboard } from "@/components/business/company-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.company.nav");
  return { title: t("dashboard") };
}

/** The company home (Dashboard) — the landing page of a company's workspace. */
export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <CompanyDashboard slug={slug} />;
}
