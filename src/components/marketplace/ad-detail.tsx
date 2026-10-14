"use client";

import { Lock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useAdPriceLabel } from "@/components/marketplace/ad-card";
import { useCurrentUser } from "@/components/auth/current-user";
import { ImageBox } from "@/components/media/media-tiles";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AD_STATUS_VARIANT,
  contactMethodNeedsValue,
  type MarketplaceAd,
} from "@/lib/marketplace/types";
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

/**
 * The contact affordance, by method. A poster's phone/email is PII the API keeps off the public
 * payload: in-app messaging shows a note; a number/email is revealed only after signing in (a
 * logged-out visitor is prompted to sign in; a signed-in one clicks to reveal it on demand). This
 * keeps the directory browsable while contact details can't be scraped in bulk.
 */
function AdContact({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const { user } = useCurrentUser();

  const needsValue =
    contactMethodNeedsValue(ad.contact_method) &&
    (ad.has_contact_value ?? ad.contact_value != null);

  // In-app only (nothing to reveal): on-platform messaging note.
  if (!needsValue) {
    return (
      <p className="text-muted-foreground bg-muted rounded-lg p-3 text-sm">
        {t("detail.contactInApp")}
      </p>
    );
  }

  // Logged out: don't even hit the reveal endpoint — prompt to sign in.
  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(buttonVariants({ variant: "default" }), "w-full")}
      >
        <Lock className="size-4" />
        {t("detail.signInToContact")}
      </Link>
    );
  }

  return <RevealContact ad={ad} />;
}

type RevealState = "idle" | "loading" | "error" | "limited" | "signedOut";

/** Signed-in reveal: fetch the poster's contact on demand, then render the actionable link. */
function RevealContact({ ad }: { ad: MarketplaceAd }) {
  const t = useTranslations("marketplace");
  const [state, setState] = useState<RevealState>("idle");
  const [value, setValue] = useState<string | null>(null);

  async function reveal() {
    setState("loading");
    try {
      const response = await fetch(
        `/api/marketplace/ads/${encodeURIComponent(ad.id)}/contact`,
      );
      if (response.ok) {
        const data = (await response.json()) as {
          contact?: { contact_value: string | null };
        };
        setValue(data.contact?.contact_value ?? null);
        setState("idle");
        return;
      }
      setState(
        response.status === 401
          ? "signedOut"
          : response.status === 429
            ? "limited"
            : "error",
      );
    } catch {
      setState("error");
    }
  }

  // Revealed — the actionable link (call / email / WhatsApp), labelled with the value.
  if (value) {
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
        {value}
      </a>
    );
  }

  const message =
    state === "limited"
      ? t("detail.contactRateLimited")
      : state === "signedOut"
        ? t("detail.contactSignedOut")
        : state === "error"
          ? t("detail.contactError")
          : null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        className="w-full"
        onClick={reveal}
        disabled={state === "loading"}
      >
        {state === "loading" ? t("detail.revealingContact") : t("detail.revealContact")}
      </Button>
      {message ? (
        <p className="text-destructive text-sm" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
