import { Globe, Mail, Navigation, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AddressLines } from "@/components/address/address-lines";
import { BusinessLogo } from "@/components/business/business-logo";
import { focalObjectPosition } from "@/lib/banner-focal";
import {
  DAYS,
  socialDisplay,
  socialLabel,
} from "@/components/business/business-constants";
import { ProfileMap } from "@/components/business/public/profile-map";
import { ReviewsSection } from "@/components/business/public/reviews-section";
import { StarRating } from "@/components/business/public/star-rating";
import { ClosuresReadout } from "@/components/business/closures-editor";
import { flagEmoji, formatPhone } from "@/components/business/phone-format";
import { ShareButton } from "@/components/business/public/share-button";
import { Badge } from "@/components/ui/badge";
import { formatBusinessAddress } from "@/lib/format-address";
import { formatTime } from "@/lib/format-time";
import { cn } from "@/lib/utils";

import type { PublicBusiness, PublicReviewsPage } from "@/lib/public-business";

/** The maps deep-link for the "Directions" action — by coordinates when present, else by address. */
function directionsHref(business: PublicBusiness): string | null {
  const main =
    business.addresses.find((address) => address.is_main) ??
    business.addresses[0];
  if (!main) {
    return null;
  }
  const query =
    main.latitude !== null && main.longitude !== null
      ? `${main.latitude},${main.longitude}`
      : [main.address_1, main.city, main.country].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function BusinessProfile({
  business,
  locale,
  reviews,
}: {
  business: PublicBusiness;
  locale: string;
  reviews: PublicReviewsPage;
}) {
  const t = await getTranslations("businesses.public");
  const days = await getTranslations("businesses.detail.days");

  const main =
    business.addresses.find((address) => address.is_main) ??
    business.addresses[0];
  const phones = business.contacts.filter((c) => c.type === "phone");
  const emails = business.contacts.filter((c) => c.type === "email");
  const websites = business.contacts.filter((c) => c.type === "website");
  const directions = directionsHref(business);
  const firstPhone = phones[0];
  const firstWebsite = websites[0];

  return (
    <article className="mx-auto w-full max-w-[90rem] px-4 pb-16 sm:px-6">
      {/* Banner */}
      <div className="relative mt-4 h-44 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-green to-brand-green-deep ring-1 ring-black/5 sm:h-64">
        {business.banner ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
          <img
            src={business.banner}
            alt=""
            className="size-full object-cover"
            style={{ objectPosition: focalObjectPosition(business.banner_focal) }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent" />
        )}
      </div>

      {/* Logo — pulled up over the banner. The negative margin lives on a div (Safari won't pull up
          the flex <span> the Avatar renders). */}
      <div className="relative z-10 -mt-16 ml-1 w-fit sm:-mt-20">
        <BusinessLogo
          name={business.name}
          src={business.logo}
          className="bg-background ring-background size-28 border shadow-lg ring-4 sm:size-36 rounded-[26px] sm:rounded-[32px]"
          fallbackClassName="text-4xl"
        />
      </div>

      {/* Identity + actions */}
      <div className="mt-4 flex flex-col gap-4 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-bold tracking-tight text-balance sm:text-4xl">
            {business.name}
          </h1>
          {business.headline ? (
            <p className="text-muted-foreground mt-1.5 max-w-prose text-base text-pretty sm:text-lg">
              {business.headline}
            </p>
          ) : null}
          {business.rating_count > 0 ? (
            <div className="mt-2.5 flex items-center gap-2">
              <StarRating value={business.rating_avg} size={18} />
              <span className="text-sm font-semibold tabular-nums">
                {business.rating_avg.toFixed(1)}
              </span>
              <span className="text-muted-foreground text-sm">
                {t("reviews.count", { count: business.rating_count })}
              </span>
            </div>
          ) : null}
          {business.categories.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {business.categories.map((category) => (
                <Badge key={category.id} variant="neutral">
                  {category.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end sm:pb-1">
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
              href={firstWebsite.value}
              target="_blank"
              rel="noopener noreferrer"
              className="border-input hover:bg-accent focus-visible:ring-ring inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              <Globe className="size-4" />
              {t("website")}
            </a>
          ) : null}
          <ShareButton title={business.name} />
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Main column */}
        <div className="space-y-8">
          {business.description ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("about")}
              </h2>
              <p className="mt-3 max-w-prose leading-relaxed text-pretty">
                {business.description}
              </p>
            </section>
          ) : null}

          {business.amenities.length > 0 ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("amenities")}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {business.amenities.map((amenity) => (
                  <span
                    key={amenity.id}
                    className="bg-muted rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {amenity.name}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {business.images.length > 0 ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("photos")}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {business.images.map((image, index) => (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
                  <img
                    key={image.id}
                    src={image.url}
                    alt={t("photoAlt", { name: business.name, number: index + 1 })}
                    className="aspect-square w-full rounded-xl border object-cover"
                    loading="lazy"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {business.closures.length > 0 ? (
            <section>
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {t("closures")}
              </h2>
              <div className="mt-3">
                <ClosuresReadout closures={business.closures} />
              </div>
            </section>
          ) : null}

          <ReviewsSection
            slug={business.slug}
            initial={reviews}
            ratingCount={business.rating_count}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {business.opening_hours.length > 0 ? (
            <div className="bg-muted/40 rounded-2xl border p-5">
              <h2 className="mb-3 text-sm font-semibold">{t("hours")}</h2>
              <ul className="space-y-1.5 text-sm tabular-nums">
                {DAYS.map((day) => {
                  const entry = business.opening_hours.find(
                    (hour) => hour.day_of_week === day,
                  );
                  const open =
                    entry && !entry.closed_all_day && entry.open_time && entry.close_time
                      ? `${formatTime(entry.open_time, locale)} – ${formatTime(entry.close_time, locale)}`
                      : t("closed");
                  return (
                    <li
                      key={day}
                      className="text-muted-foreground flex justify-between gap-4"
                    >
                      <span>{days(day)}</span>
                      <span
                        className={cn(open === t("closed") && "opacity-60")}
                      >
                        {open}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {main ? (
            <div className="bg-muted/40 rounded-2xl border p-5">
              <h2 className="mb-3 text-sm font-semibold">{t("location")}</h2>
              {main.latitude !== null && main.longitude !== null ? (
                <div className="mb-3">
                  <ProfileMap
                    latitude={main.latitude}
                    longitude={main.longitude}
                    label={business.name}
                  />
                </div>
              ) : null}
              <AddressLines lines={formatBusinessAddress(main, locale)} />
            </div>
          ) : null}

          {phones.length + emails.length + websites.length + business.socials.length > 0 ? (
            <div className="bg-muted/40 rounded-2xl border p-5">
              <h2 className="mb-3 text-sm font-semibold">{t("contact")}</h2>
              <ul className="space-y-2.5 text-sm">
                {phones.map((phone) => (
                  <li key={phone.id} className="flex items-center gap-3">
                    <Phone className="text-muted-foreground size-4 shrink-0" />
                    <a href={`tel:${phone.value}`} className="hover:underline">
                      {phone.meta?.country
                        ? `${flagEmoji(phone.meta.country)} `
                        : ""}
                      {formatPhone(phone.value, phone.meta?.country)}
                    </a>
                  </li>
                ))}
                {emails.map((email) => (
                  <li key={email.id} className="flex items-center gap-3">
                    <Mail className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={`mailto:${email.value}`}
                      className="break-all hover:underline"
                    >
                      {email.value}
                    </a>
                  </li>
                ))}
                {websites.map((website) => (
                  <li key={website.id} className="flex items-center gap-3">
                    <Globe className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={website.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all hover:underline"
                    >
                      {website.value.replace(/^https?:\/\//, "")}
                    </a>
                  </li>
                ))}
                {business.socials.map((social) => (
                  <li key={social.id} className="flex items-center gap-3">
                    <Globe className="text-muted-foreground size-4 shrink-0" />
                    <a
                      href={socialDisplay(social.platform, social.handle)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {socialLabel(social.platform)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
