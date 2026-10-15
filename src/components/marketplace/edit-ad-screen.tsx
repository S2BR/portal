"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AdForm } from "@/components/marketplace/ad-form";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { MarketplaceAd } from "@/lib/marketplace/types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; ad: MarketplaceAd }
  | { kind: "missing" };

/** Loads one of the owner's ads (any status) and renders its edit form + photo manager. */
export function EditAdScreen({ slug }: { slug: string }) {
  const t = useTranslations("marketplace");
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/marketplace/my-ads/${encodeURIComponent(slug)}`,
      );
      if (cancelled) {
        return;
      }
      if (res.ok) {
        const data = (await res.json()) as { ad?: MarketplaceAd };
        setState(
          data.ad ? { kind: "ready", ad: data.ad } : { kind: "missing" },
        );
      } else {
        setState({ kind: "missing" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square w-full rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (state.kind === "missing") {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted-foreground text-sm">{t("edit.notFound")}</p>
        <Link
          href="/portal/marketplace"
          className={buttonVariants({ variant: "outline" })}
        >
          {t("edit.back")}
        </Link>
      </div>
    );
  }

  return <AdForm ad={state.ad} />;
}
