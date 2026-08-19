import { MapPin, Navigation, Star } from "lucide-react";
import Link from "next/link";

import { BusinessLogo } from "@/components/business/business-logo";
import { Badge } from "@/components/ui/badge";

import type { PublicBusinessCard } from "@/lib/public-business";

/** A single directory result — links to the business's public profile. */
export function BusinessCard({
  business,
  distanceLabel,
}: {
  business: PublicBusinessCard;
  /** Pre-formatted, localized distance (e.g. "3.2 km"), shown when a "near me" sort is active. */
  distanceLabel?: string;
}) {
  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="group hover:border-primary/40 bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="from-brand-green to-brand-green-deep relative h-20 bg-gradient-to-br">
        {business.banner ? (
          // Decorative — the business name is the heading below. A plain <img> paints the cached,
          // presigned banner instantly; the gradient shows through until it loads / when there's none.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.banner}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : null}
        <BusinessLogo
          name={business.name}
          src={business.logo}
          className="bg-background absolute -bottom-8 left-4 size-20 border shadow-sm"
        />
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
          {distanceLabel ? (
            <span className="text-brand-green inline-flex items-center gap-1 text-xs font-medium">
              <Navigation className="size-3" aria-hidden />
              {distanceLabel}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
