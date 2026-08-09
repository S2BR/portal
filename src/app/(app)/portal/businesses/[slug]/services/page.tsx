import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/business/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.company.nav");
  return { title: t("services") };
}

/** Services — placeholder for the company's service offerings. */
export default async function CompanyServicesPage() {
  const t = await getTranslations("businesses.company");

  return (
    <ComingSoon
      icon={Wrench}
      title={t("nav.services")}
      subtitle={t("comingSoon.subtitle")}
    />
  );
}
