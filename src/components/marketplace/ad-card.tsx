"use client";

import { MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { ImageBox } from "@/components/media/media-tiles";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { AD_STATUS_VARIANT, type MarketplaceAd } from "@/lib/marketplace/types";

/** The price line for an ad — a formatted amount, or a word for free/trade/contact. */
export function useAdPriceLabel(): (ad: MarketplaceAd) => string {
  const t = useTranslations("marketplace.price");
  const locale = useLocale();

  return (ad: MarketplaceAd): string => {
    switch (ad.price_type) {
      case "free":
        return t("free");
      case "trade":
        return t("trade");
      case "contact":
        return t("contact");
      default:
        return ad.price === null
          ? t("contact")
          : formatMoney(ad.price, ad.currency, locale) +
              (ad.price_type === "negotiable"
                ? " " + t("negotiableSuffix")
                : "");
    }
  };
}

/** A single marketplace result — links to the ad's detail page. Mirrors the directory `BusinessCard`. */
export function AdCard({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const priceLabel = useAdPriceLabel();

  return (
    <Link
      href={`/marketplace/${encodeURIComponent(ad.slug)}`}
      className="group hover:border-primary/40 bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="relative">
        <ImageBox
          src={ad.images[0]?.url ?? null}
          alt=""
          className="aspect-[4/3] w-full rounded-none border-0"
        />
        {ad.status !== "available" ? (
          <Badge
            variant={AD_STATUS_VARIANT[ad.status]}
            className="absolute start-2 top-2"
          >
            {t(`status.${ad.status}`)}
          </Badge>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="font-semibold">{priceLabel(ad)}</div>
        <p className="line-clamp-2 text-sm">{ad.title}</p>
        {ad.location.label ? (
          <span className="text-muted-foreground mt-auto inline-flex items-center gap-1 pt-1 text-xs">
            <MapPin className="size-3" aria-hidden />
            {ad.location.label}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
