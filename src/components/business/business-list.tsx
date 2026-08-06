"use client";

import { Building2, Plus, User2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The signed-in user's businesses as a list of cards, each linking to its detail page. Shows a
 * skeleton while loading and an empty state (with a create link) when there are none.
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-12 text-center">
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
    <div className="grid gap-3 sm:grid-cols-2">
      {businesses.map((business) => {
        const Icon = business.type === "company" ? Building2 : User2;
        return (
          <Link
            key={business.id}
            href={`/portal/businesses/${business.slug}`}
            className="focus-visible:ring-ring rounded-xl outline-none focus-visible:ring-2"
          >
            <div className="bg-card hover:border-primary/40 flex h-full items-start gap-3 rounded-xl border p-4 transition-colors">
              <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg">
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
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-medium">{business.name}</p>
                {business.headline ? (
                  <p className="text-muted-foreground truncate text-sm">
                    {business.headline}
                  </p>
                ) : null}
                <Badge variant="outline" className="mt-1">
                  {business.type === "company"
                    ? types("company.title")
                    : types("selfEmployed.title")}
                </Badge>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
