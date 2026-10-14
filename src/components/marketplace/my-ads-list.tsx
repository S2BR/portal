"use client";

import { Pencil, RefreshCw, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { useAdPriceLabel } from "@/components/marketplace/ad-card";
import { MyAdsSkeleton } from "@/components/marketplace/ad-skeleton";
import { ImageBox } from "@/components/media/media-tiles";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AD_STATUS_VARIANT,
  type AdsPage,
  type MarketplaceAd,
} from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

/** The owner's ad manager: their ads (any status) with edit / renew / delete actions. */
export function MyAdsList() {
  const t = useTranslations("marketplace");
  const priceLabel = useAdPriceLabel();
  const [ads, setAds] = useState<MarketplaceAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/my-ads");
      const data = (await res.json()) as AdsPage;
      setAds(data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function renew(ad: MarketplaceAd) {
    setActing(ad.id);
    try {
      const res = await fetch(`/api/marketplace/ads/${ad.slug}/renew`, {
        method: "POST",
      });
      if (!res.ok) {
        toast.error(t("myAds.error"));
        return;
      }
      toast.success(t("myAds.renewed"));
      await load();
    } finally {
      setActing(null);
    }
  }

  async function remove(ad: MarketplaceAd) {
    if (!window.confirm(t("myAds.deleteConfirm"))) {
      return;
    }
    setActing(ad.id);
    try {
      const res = await fetch(`/api/marketplace/ads/${ad.slug}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.error(t("myAds.error"));
        return;
      }
      toast.success(t("myAds.deleted"));
      setAds((current) => current.filter((item) => item.id !== ad.id));
    } finally {
      setActing(null);
    }
  }

  if (loading) {
    return <MyAdsSkeleton />;
  }

  if (ads.length === 0) {
    return (
      <p className="text-muted-foreground py-16 text-center text-sm">
        {t("myAds.empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border">
      {ads.map((ad) => (
        <li key={ad.id} className="flex items-center gap-4 p-3">
          <ImageBox
            src={ad.images[0]?.url ?? null}
            alt=""
            className="size-16 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{ad.title}</span>
              <Badge variant={AD_STATUS_VARIANT[ad.status]}>
                {t(`status.${ad.status}`)}
              </Badge>
            </div>
            <div className="text-muted-foreground text-xs">
              {priceLabel(ad)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {ad.status === "expired" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void renew(ad)}
                disabled={acting === ad.id}
              >
                <RefreshCw className="size-4" />
                {t("myAds.renew")}
              </Button>
            ) : null}
            <Link
              href={`/portal/marketplace/${ad.slug}/edit`}
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
              )}
              aria-label={t("myAds.edit")}
            >
              <Pencil className="size-4" />
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => void remove(ad)}
              disabled={acting === ad.id}
              aria-label={t("myAds.delete")}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
