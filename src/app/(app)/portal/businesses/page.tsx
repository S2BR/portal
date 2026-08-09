import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { BusinessList } from "@/components/business/business-list";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("businesses");
  return { title: t("title") };
}

/**
 * "My businesses" — the list of businesses the signed-in user owns, and the landing spot after
 * creating one. Each card links to its detail page (view / edit / delete).
 */
export default async function BusinessesPage() {
  const t = await getTranslations("businesses");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/portal/businesses/new">
            <Plus className="size-4" />
            {t("createAnother")}
          </Link>
        </Button>
      </div>

      <BusinessList />
    </div>
  );
}
