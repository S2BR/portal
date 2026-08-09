import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { BusinessDetail } from "@/components/business/business-detail";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.company.nav");
  return { title: t("information") };
}

/**
 * Company information — the business's full detail: view it, edit inline, or delete it (organized in
 * tabs). Resolves the business by slug through the BFF; a slug the user doesn't own renders a "not
 * found" state.
 */
export default async function CompanyInformationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return <BusinessDetail slug={slug} />;
}
