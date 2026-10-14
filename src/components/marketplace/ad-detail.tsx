"use client";

import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useAdPriceLabel } from "@/components/marketplace/ad-card";
import { ImageBox } from "@/components/media/media-tiles";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { AD_STATUS_VARIANT, type MarketplaceAd } from "@/lib/marketplace/types";
import { cn } from "@/lib/utils";

function relativeTime(iso: string | null, locale: string): string | null {
  if (!iso) {
    return null;
  }
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs) {
      return rtf.format(-Math.round(seconds / secs), unit);
    }
  }
  return rtf.format(0, "minute");
}

/** The public detail view of a single marketplace ad. */
export function AdDetail({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const locale = useLocale();
  const priceLabel = useAdPriceLabel();
  const [active, setActive] = useState(0);

  const cover = ad.images[active]?.url ?? ad.images[0]?.url ?? null;
  const posted = relativeTime(ad.created_at, locale);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      {/* Gallery */}
      <div className="space-y-3">
        <ImageBox
          src={cover}
          alt={ad.title}
          className="aspect-[4/3] w-full rounded-2xl object-contain"
        />
        {ad.images.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ad.images.map((image, index) => (
              <Button
                key={image.id}
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setActive(index)}
                className={cn(
                  "size-16 shrink-0 overflow-hidden rounded-lg p-0",
                  index === active && "ring-primary ring-2",
                )}
              >
                <ImageBox
                  src={image.url}
                  alt=""
                  className="size-full rounded-lg"
                />
              </Button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Info */}
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {ad.status !== "available" ? (
              <Badge variant={AD_STATUS_VARIANT[ad.status]}>
                {t(`status.${ad.status}`)}
              </Badge>
            ) : null}
            {ad.condition ? (
              <Badge variant="neutral">{t(`condition.${ad.condition}`)}</Badge>
            ) : null}
          </div>
          <div className="text-2xl font-semibold">{priceLabel(ad)}</div>
          <h1 className="font-heading text-xl font-bold tracking-tight">
            {ad.title}
          </h1>
        </div>

        <div className="text-muted-foreground space-y-1 text-sm">
          {ad.location.label ? (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-4" />
              {ad.location.label}
            </div>
          ) : null}
          {posted ? <div>{t("detail.posted", { when: posted })}</div> : null}
        </div>

        <AdContact ad={ad} />
      </div>

      {/* Description — full width under both columns */}
      <div className="lg:col-span-2">
        <h2 className="mb-2 font-semibold">{t("detail.description")}</h2>
        <p className="text-sm whitespace-pre-wrap">{ad.description}</p>
      </div>
    </div>
  );
}

/** The contact affordance, by method. In-app messaging isn't built yet, so it shows a note. */
function AdContact({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const value = ad.contact_value ?? "";

  if (ad.contact_method === "in_app" || value === "") {
    return (
      <p className="text-muted-foreground bg-muted rounded-lg p-3 text-sm">
        {t("detail.contactInApp")}
      </p>
    );
  }

  const href =
    ad.contact_method === "phone"
      ? `tel:${value}`
      : ad.contact_method === "email"
        ? `mailto:${value}`
        : `https://wa.me/${value.replace(/[^0-9]/g, "")}`;

  const Icon =
    ad.contact_method === "phone"
      ? Phone
      : ad.contact_method === "email"
        ? Mail
        : MessageCircle;

  return (
    <a
      href={href}
      target={ad.contact_method === "whatsapp" ? "_blank" : undefined}
      rel="noopener noreferrer"
      className={cn(buttonVariants({ variant: "default" }), "w-full")}
    >
      <Icon className="size-4" />
      {t(`detail.contactVia.${ad.contact_method}`)}
    </a>
  );
}
