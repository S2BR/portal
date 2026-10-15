"use client";

import { ChevronLeft, Lock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { useAdPriceLabel } from "@/components/marketplace/ad-card";
import { useCurrentUser } from "@/components/auth/current-user";
import { ImageBox } from "@/components/media/media-tiles";
import { PhotoLightbox } from "@/components/media/photo-lightbox";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AD_STATUS_VARIANT,
  contactMethodNeedsValue,
  type AdAttributeDisplay,
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
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const cover = ad.images[active]?.url ?? ad.images[0]?.url ?? null;
  const posted = relativeTime(ad.created_at, locale);
  const specs = ad.attributes_display ?? [];

  return (
    <div className="space-y-10">
      {/* Breadcrumb */}
      <nav className="text-muted-foreground flex items-center gap-2 text-sm">
        <Link
          href="/marketplace"
          className="hover:text-foreground inline-flex items-center gap-1 font-medium transition-colors"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("detail.backToMarketplace")}
        </Link>
        {ad.category ? (
          <>
            <span aria-hidden>·</span>
            <span className="text-foreground">{ad.category.name}</span>
          </>
        ) : null}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        {/* Gallery — the hero. Click to open the full-screen carousel. */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setOpenIndex(active)}
            aria-label={t("detail.openGallery")}
            className="focus-visible:ring-ring bg-muted block w-full overflow-hidden rounded-3xl border outline-none focus-visible:ring-2"
          >
            <ImageBox
              src={cover}
              alt={ad.title}
              className="aspect-square w-full object-cover"
            />
          </button>
          {ad.images.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {ad.images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setActive(index)}
                  onDoubleClick={() => setOpenIndex(index)}
                  aria-label={`${t("detail.photo")} ${index + 1}`}
                  aria-current={index === active}
                  className={cn(
                    "focus-visible:ring-ring size-18 shrink-0 overflow-hidden rounded-xl border transition focus-visible:ring-2 focus-visible:outline-none",
                    index === active
                      ? "ring-primary ring-2"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <ImageBox
                    src={image.url}
                    alt=""
                    className="size-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Sticky action card */}
        <aside className="lg:sticky lg:top-24">
          <div className="bg-card space-y-5 rounded-3xl p-6 shadow-sm">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {ad.category ? (
                  <Badge variant="outline">{ad.category.name}</Badge>
                ) : null}
                {ad.status !== "available" ? (
                  <Badge variant={AD_STATUS_VARIANT[ad.status]}>
                    {t(`status.${ad.status}`)}
                  </Badge>
                ) : null}
                {ad.condition ? (
                  <Badge variant="neutral">
                    {t(`condition.${ad.condition}`)}
                  </Badge>
                ) : null}
              </div>

              <h1 className="font-heading text-2xl leading-tight font-bold tracking-tight text-balance sm:text-3xl">
                {ad.title}
              </h1>
              <div className="text-2xl font-semibold">{priceLabel(ad)}</div>
            </div>

            {ad.location.label || posted ? (
              <div className="text-muted-foreground space-y-1.5 border-t pt-4 text-sm">
                {ad.location.label ? (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="size-4 shrink-0" aria-hidden />
                    {ad.location.label}
                  </div>
                ) : null}
                {posted ? (
                  <div>{t("detail.posted", { when: posted })}</div>
                ) : null}
              </div>
            ) : null}

            <AdContact ad={ad} />
          </div>
        </aside>
      </div>

      {/* Description + details — full width below the hero */}
      <div className="space-y-10">
        <section>
          <h2 className="font-heading mb-3 text-lg font-semibold tracking-tight">
            {t("detail.description")}
          </h2>
          <p className="max-w-2xl text-[0.9375rem] leading-relaxed whitespace-pre-wrap">
            {ad.description}
          </p>
        </section>

        {specs.length > 0 ? (
          <section>
            <h2 className="font-heading mb-4 text-lg font-semibold tracking-tight">
              {t("detail.specs")}
            </h2>
            <AdSpecs items={specs} />
          </section>
        ) : null}
      </div>

      <PhotoLightbox
        images={ad.images}
        openIndex={openIndex}
        onOpenChange={setOpenIndex}
        alt={(index) => `${ad.title} · ${t("detail.photo")} ${index + 1}`}
        labels={{
          close: t("detail.close"),
          prev: t("detail.prevPhoto"),
          next: t("detail.nextPhoto"),
          goTo: (position) => `${t("detail.photo")} ${position}`,
        }}
      />
    </div>
  );
}

/** The ad's type-specific fields as a labelled spec grid (two columns on wider screens). */
function AdSpecs({ items }: { items: AdAttributeDisplay[] }) {
  const t = useTranslations("marketplace");
  const locale = useLocale();

  function format(item: AdAttributeDisplay): string {
    const value = item.value;
    if (value === null || value === "") {
      return "—";
    }
    if (typeof value === "boolean") {
      return value ? t("detail.yes") : t("detail.no");
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (item.type === "number" && typeof value === "number") {
      const formatted = new Intl.NumberFormat(locale).format(value);
      return item.unit ? `${formatted} ${item.unit}` : formatted;
    }
    if (item.type === "date" && typeof value === "string") {
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(date);
    }
    const text = String(value);
    return item.unit ? `${text} ${item.unit}` : text;
  }

  const mid = Math.ceil(items.length / 2);
  const twoColumns = items.length > 6;
  const columns = twoColumns ? [items.slice(0, mid), items.slice(mid)] : [items];

  return (
    <div className="bg-card rounded-2xl border px-4 sm:px-5">
      <div className={cn("grid gap-x-12", twoColumns && "sm:grid-cols-2")}>
        {columns.map((column, index) => (
          <dl
            key={index}
            className={cn("divide-y", index > 0 && "border-t sm:border-t-0")}
          >
            {column.map((item) => (
              <div
                key={item.key}
                className="flex items-baseline justify-between gap-4 py-3 text-sm"
              >
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-right font-medium">{format(item)}</dd>
              </div>
            ))}
          </dl>
        ))}
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
