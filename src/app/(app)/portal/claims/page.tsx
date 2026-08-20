import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MyClaims } from "@/components/claims/my-claims";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("myClaims");
  return { title: t("title") };
}

/**
 * "My claims" — the ownership claims the signed-in user has submitted and where each one stands
 * (auto-approved, pending review, approved, or not approved). Reads the user's own claims from the
 * claims BFF.
 */
export default async function ClaimsPage() {
  const t = await getTranslations("myClaims");

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {t("title")}
        </h1>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </div>

      <MyClaims />
    </div>
  );
}
