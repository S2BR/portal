import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ComingSoon } from "@/components/business/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses.workspace.nav");
  return { title: t("services") };
}

/** Services — placeholder for the company's service offerings. */
export default async function BusinessServicesPage() {
  const t = await getTranslations("businesses.workspace");

  return (
    <ComingSoon
      icon={Wrench}
      title={t("nav.services")}
      subtitle={t("comingSoon.subtitle")}
    />
  );
}
