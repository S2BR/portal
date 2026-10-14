import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { MyAdsList } from "@/components/marketplace/my-ads-list";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("marketplace");
  return { title: t("myAds.title") };
}

/** "My ads" — the signed-in user's marketplace listings, with post / edit / renew / delete. */
export default async function MyMarketplacePage() {
  const t = await getTranslations("marketplace");

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {t("myAds.title")}
          </h1>
          <p className="text-muted-foreground text-sm">{t("myAds.subtitle")}</p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/portal/marketplace/new">
            <Plus className="size-4" />
            {t("myAds.new")}
          </Link>
        </Button>
      </div>

      <MyAdsList />
    </div>
  );
}
