import { Package } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/business/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.workspace.nav");
  return { title: t("products") };
}

/** Products — placeholder for the company's product catalog. */
export default async function BusinessProductsPage() {
  const t = await getTranslations("businesses.workspace");

  return (
    <ComingSoon
      icon={Package}
      title={t("nav.products")}
      subtitle={t("comingSoon.subtitle")}
    />
  );
}
