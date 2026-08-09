import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BusinessDashboard } from "@/components/business/business-dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.workspace.nav");
  return { title: t("dashboard") };
}

/** The company home (Dashboard) — the landing page of a company's workspace. */
export default async function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BusinessDashboard slug={slug} />;
}
