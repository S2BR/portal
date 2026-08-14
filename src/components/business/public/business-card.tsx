import { Building2, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type { PublicBusinessCard } from "@/lib/public-business";

/** A single directory result — links to the business's public profile. */
export function BusinessCard({ business }: { business: PublicBusinessCard }) {
  return (
    <Link
      href={`/businesses/${business.slug}`}
      className="group hover:border-primary/40 bg-card focus-visible:ring-ring flex flex-col overflow-hidden rounded-2xl border transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <div className="from-brand-green to-brand-green-deep relative h-20 bg-gradient-to-br">
        <span className="bg-background absolute -bottom-5 left-4 flex size-12 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
          {business.logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
            <img src={business.logo} alt="" className="size-full object-cover" />
          ) : (
            <Building2 className="text-muted-foreground size-5" />
          )}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 pt-7">
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
        </div>
      </div>
    </Link>
  );
}
