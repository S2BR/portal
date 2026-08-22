import { Clock, MapPin, Navigation, Star } from "lucide-react";
import Link from "next/link";

import { BusinessBannerPlaceholder } from "@/components/business/public/business-banner-placeholder";
import { BusinessLogo } from "@/components/business/business-logo";
import { Badge } from "@/components/ui/badge";

import type { PublicBusinessCard } from "@/lib/public-business";

/** A single directory result — links to the business's public profile. */
export function BusinessCard({
  business,
  distanceLabel,
  closesLabel,
}: {
  business: PublicBusinessCard;
  /** Pre-formatted, localized distance (e.g. "3.2 km"), shown when a "near me" sort is active. */
  distanceLabel?: string;
  /** Pre-formatted, localized "Closes 6:00 PM" — shown only when the "open now" filter is active. */
  closesLabel?: string;
}) {
  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="group hover:border-primary/40 bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="bg-muted relative h-20">
        {business.banner ? (
          // Decorative — the business name is the heading below. A plain <img> paints the cached,
          // presigned banner instantly; the gray placeholder shows until it loads / when there's none.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.banner}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <BusinessBannerPlaceholder />
        )}
        {distanceLabel ? (
          // Pinned to the banner's top-right over a translucent scrim so it stays legible on any
          // banner image (or the gray placeholder when there's none).
          <span className="text-brand-green-deep dark:text-brand-green absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium backdrop-blur-sm dark:bg-black/75">
            <Navigation className="size-3" aria-hidden />
            {distanceLabel}
          </span>
        ) : null}
        {/* Logo on a frosted-glass plate, like the profile header. Positioning lives on the div (not
            the Avatar span) and there's no z-index: Safari only blurs the backdrop within the same
            stacking context, so isolating the plate would kill the frost. DOM order paints it over
            the banner. */}
        <div className="absolute start-4 -bottom-8 overflow-hidden rounded-[18px] border border-white/40 bg-white/20 p-1 shadow-lg backdrop-blur-md dark:border-white/15 dark:bg-white/10">
          <BusinessLogo
            name={business.name}
            src={business.logo}
            className="bg-background size-20 rounded-xl"
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-11">
        <h3 className="leading-tight font-semibold">{business.name}</h3>
        {business.headline ? (
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {business.headline}
          </p>
        ) : null}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          {business.categories.slice(0, 2).map((category) => (
            <Badge key={category.slug} variant="neutral">
              {category.name}
            </Badge>
          ))}
          {business.city ? (
            <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
              <MapPin className="size-3" aria-hidden />
              {business.city}
            </span>
          ) : null}
          {business.rating_count > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums">
              <Star
                className="text-brand-gold size-3 fill-current stroke-0"
                aria-hidden
              />
              {business.rating_avg.toFixed(1)}
              <span className="text-muted-foreground font-normal">
                ({business.rating_count})
              </span>
            </span>
          ) : null}
          {closesLabel ? (
            <span className="text-brand-green-deep dark:text-brand-green inline-flex items-center gap-1 text-xs font-medium">
              <Clock className="size-3" aria-hidden />
              {closesLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
