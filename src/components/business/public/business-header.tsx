import { Globe, Navigation, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { BusinessLogo } from "@/components/business/business-logo";
import { socialDisplay } from "@/components/business/business-constants";
import { BusinessBannerPlaceholder } from "@/components/business/public/business-banner-placeholder";
import { ClaimBusinessButton } from "@/components/business/public/claim-business-button";
import { HoursDisclosure } from "@/components/business/public/hours-disclosure";
import { ProfileCategories } from "@/components/business/public/profile-categories";
import { ShareButton } from "@/components/business/public/share-button";
import { StarRating } from "@/components/business/public/star-rating";
import { SocialIcon } from "@/components/business/social-icon";
import { focalObjectPosition } from "@/lib/banner-focal";
import { directionsHref } from "@/lib/directions";
import type { PublicBusiness } from "@/lib/public-business";
import { externalHref } from "@/lib/url";

/**
 * The shared header for every business surface (profile, products, reviews) — banner, logo, identity
 * (name / rating / open-now), categories, and the primary actions, plus the mobile action bar and the
 * LocalBusiness structured data. Rendered once by the business layout so it PERSISTS across the tabs:
 * navigating between Overview / Products / Reviews swaps only the content below, never this.
 */
export async function BusinessHeader({
  business,
}: {
  business: PublicBusiness;
}) {
  const t = await getTranslations("businesses.public");

  const main =
    business.addresses.find((address) => address.is_main) ??
    business.addresses[0];
  const phones = business.contacts.filter((c) => c.type === "phone");
  const websites = business.contacts.filter((c) => c.type === "website");
  const directions = directionsHref(business);
  const firstPhone = phones[0];
  const firstWebsite = websites[0];
  const whatsapp = business.socials.find(
    (social) => social.platform === "whatsapp",
  );
  const whatsappHref = whatsapp
    ? socialDisplay("whatsapp", whatsapp.handle)
    : null;

  // schema.org LocalBusiness structured data → rich results once the public pages are indexable.
  const baseUrl = process.env.APP_URL ?? "https://s2br.com";
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    url: `${baseUrl}/businesses/${business.slug}`,
  };
  const heroImage = business.banner ?? business.logo;
  if (business.headline ?? business.description) {
    jsonLd.description = business.headline ?? business.description;
  }
  if (heroImage) {
    jsonLd.image = heroImage;
  }
  if (firstPhone) {
    jsonLd.telephone = firstPhone.value;
  }
  if (main) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: [main.address_1, main.address_2]
        .filter(Boolean)
        .join(", "),
      addressLocality: main.city,
      ...(main.state_province ? { addressRegion: main.state_province } : {}),
      ...(main.postal_code ? { postalCode: main.postal_code } : {}),
      addressCountry: main.country,
    };
    if (main.latitude !== null && main.longitude !== null) {
      jsonLd.geo = {
        "@type": "GeoCoordinates",
        latitude: main.latitude,
        longitude: main.longitude,
      };
    }
  }
  if (business.rating_count > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: business.rating_avg,
      reviewCount: business.rating_count,
    };
  }

  return (
    <>
      {/* Static, server-built structured data (no user HTML) — rich results for local search. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Full-span banner. */}
      <div className="bg-muted relative h-48 w-full overflow-hidden sm:h-72 lg:h-80">
        {business.banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
          <img
            src={business.banner}
            alt=""
            className="size-full object-cover"
            style={{
              objectPosition: focalObjectPosition(business.banner_focal),
            }}
          />
        ) : (
          <BusinessBannerPlaceholder color={business.colors?.primary} />
        )}
      </div>

      <div className="mx-auto w-full max-w-[90rem] px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
          <div className="relative -mt-10 w-fit shrink-0 sm:-mt-10">
            <div className="overflow-hidden rounded-[32px] border border-white/40 bg-white/20 p-1.5 shadow-lg backdrop-blur-md sm:rounded-[40px] sm:p-2 dark:border-white/15 dark:bg-white/10">
              <BusinessLogo
                name={business.name}
                src={business.logo}
                color={business.colors?.primary}
                className="bg-background size-28 rounded-[26px] sm:size-36 sm:rounded-[32px]"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1 sm:pb-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-4xl">
              {business.name}
            </h1>
            {business.headline ? (
              <p className="text-muted-foreground max-w-prose text-base text-pretty sm:text-lg">
                {business.headline}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              {business.rating_count > 0 ? (
                <Link
                  href={`/businesses/${business.slug}/reviews`}
                  className="group inline-flex w-fit items-center gap-2"
                >
                  <StarRating value={business.rating_avg} size={18} />
                  <span className="text-sm font-semibold tabular-nums">
                    {business.rating_avg.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground group-hover:text-foreground text-sm underline-offset-2 group-hover:underline">
                    {t("reviews.count", { count: business.rating_count })}
                  </span>
                </Link>
              ) : (
                <Link
                  href={`/businesses/${business.slug}/reviews`}
                  className="text-muted-foreground hover:text-foreground inline-block text-sm underline-offset-2 hover:underline"
                >
                  {t("reviews.beFirst")}
                </Link>
              )}
              {/* Live open status; tap it for the full weekly hours (opens a dialog). */}
              {business.open_slots.length > 0 ? (
                <HoursDisclosure
                  openSlots={business.open_slots}
                  timezone={business.timezone}
                  openingHours={business.opening_hours}
                  closures={business.closures}
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-4 px-1 sm:flex-row sm:items-center sm:justify-between">
          {business.categories.length > 0 ? (
            <ProfileCategories categories={business.categories} />
          ) : null}

          <div className="flex flex-wrap items-center gap-2 sm:ms-auto sm:shrink-0 sm:justify-end">
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Navigation className="size-4" />
                {t("directions")}
              </a>
            ) : null}
            {firstPhone ? (
              <a
                href={`tel:${firstPhone.value}`}
                className="border-input hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Phone className="size-4" />
                {t("call")}
              </a>
            ) : null}
            {firstWebsite ? (
              <a
                href={externalHref(firstWebsite.value)}
                target="_blank"
                rel="noopener noreferrer"
                className="border-input hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                <Globe className="size-4" />
                {t("website")}
              </a>
            ) : null}
            <ShareButton title={business.name} />
            <ClaimBusinessButton
              businessId={business.id}
              isClaimed={business.is_claimed}
            />
          </div>
        </div>
      </div>

      {/* Mobile-only sticky action bar — the key contact actions always in reach on a phone. The
          layout reserves the matching bottom space on its content wrapper so nothing hides behind it. */}
      {firstPhone || whatsappHref || directions ? (
        <>
          <div className="bg-background/95 fixed inset-x-0 bottom-0 z-30 flex border-t backdrop-blur sm:hidden">
            {firstPhone ? (
              <a
                href={`tel:${firstPhone.value}`}
                className="hover:bg-muted/60 flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
              >
                <Phone className="size-5" aria-hidden />
                {t("call")}
              </a>
            ) : null}
            {whatsappHref ? (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-muted/60 flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
              >
                <SocialIcon platform="whatsapp" className="size-5" />
                {t("whatsapp")}
              </a>
            ) : null}
            {directions ? (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-muted/60 flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors"
              >
                <Navigation className="size-5" aria-hidden />
                {t("directions")}
              </a>
            ) : null}
          </div>
        </>
      ) : null}
    </>
  );
}
