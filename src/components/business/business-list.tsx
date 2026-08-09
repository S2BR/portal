"use client";

import { Building2, ChevronRight, Plus, User2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The signed-in user's businesses as a clean hairline-divided list, each row linking to its detail
 * page. Shows a skeleton while loading and an empty state (with a create link) when there are none.
 */
export function BusinessList() {
  const t = useTranslations("businesses");
  const types = useTranslations("businessNew.types");

  const [businesses, setBusinesses] = useState<Business[] | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = (await response.json()) as { businesses?: Business[] };
      setBusinesses(data.businesses ?? []);
    } catch {
      setBusinesses([]);
    }
  }, []);

  useEffect(() => {
    // One-off fetch on mount; setState runs only after the async response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  if (businesses === null) {
    return (
      <ul className="divide-y">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
          <Building2 className="size-6" />
        </span>
        <p className="text-muted-foreground max-w-sm text-sm">{t("empty")}</p>
        <Button asChild>
          <Link href="/portal/businesses/new">
            <Plus className="size-4" />
            {t("createFirst")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {businesses.map((business) => {
        const Icon = business.type === "company" ? Building2 : User2;
        return (
          <li key={business.id}>
            <Link
              href={`/portal/businesses/${business.slug}`}
              className="hover:bg-muted/50 focus-visible:bg-muted/50 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors outline-none"
            >
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                {business.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
                  <img
                    src={business.logo}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <Icon className="size-5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{business.name}</p>
                {business.headline ? (
                  <p className="text-muted-foreground truncate text-sm">
                    {business.headline}
                  </p>
                ) : null}
              </div>
              <span className="text-muted-foreground hidden text-sm sm:inline">
                {business.type === "company"
                  ? types("company.title")
                  : types("selfEmployed.title")}
              </span>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
