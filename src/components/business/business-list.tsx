"use client";

import { Building2, ChevronRight, Plus, User2 } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import type { Business } from "@/app/api/businesses/route";
import { BusinessLogo } from "@/components/business/business-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DragHandle,
  overlayClass,
  placeholderClass,
} from "@/components/ui/drag-handle";
import { RateLimited, useRateLimitToast } from "@/components/ui/rate-limited";
import { ServiceUnavailable } from "@/components/ui/service-unavailable";
import { SortableList } from "@/components/ui/sortable-list";
import { Skeleton } from "@/components/ui/skeleton";
import { parseRateLimit } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";

/**
 * The signed-in user's businesses as a clean hairline-divided list, each row linking to its detail
 * page — and drag-to-reorderable (the order persists per-user via the API). Shows a skeleton while
 * loading and an empty state (with a create link) when there are none.
 */
export function BusinessList() {
  const t = useTranslations("businesses");
  const types = useTranslations("businessNew.types");

  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [rateLimited, setRateLimited] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const notifyRateLimited = useRateLimitToast();

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = (await response.json()) as {
        businesses?: Business[];
        status?: string;
        retry_after?: number | null;
      };
      const limit = parseRateLimit(response.status, data);
      if (limit) {
        // Show the wait (with an auto-retry) instead of a silent empty list.
        setUnavailable(false);
        setRateLimited(limit.retryAfter);
        return;
      }
      // A non-ok status is the API being unavailable — show the retry state, not a fake empty list
      // (a real "you have no businesses" is a 200 with an empty array, handled below).
      if (!response.ok) {
        setRateLimited(null);
        setUnavailable(true);
        return;
      }
      setRateLimited(null);
      setUnavailable(false);
      setBusinesses(data.businesses ?? []);
    } catch {
      setRateLimited(null);
      setUnavailable(true);
    }
  }, []);

  useEffect(() => {
    // One-off fetch on mount; setState runs only after the async response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const typeLabel = (business: Business) =>
    business.type === "company"
      ? types("company.title")
      : types("selfEmployed.title");

  /** A row's content: the drag handle + the link (logo, name, type, chevron). */
  const rowBody = (business: Business, handle: ReactNode) => {
    const Icon = business.type === "company" ? Building2 : User2;
    return (
      <>
        {handle}
        <Link
          href={`/portal/businesses/${business.slug}`}
          className="hover:bg-muted/50 focus-visible:bg-muted/50 flex flex-1 items-center gap-3 rounded-lg px-2 py-3 transition-colors outline-none"
        >
          <BusinessLogo
            name={business.name}
            src={business.logo}
            className="size-10 shrink-0"
            fallback={<Icon className="size-5" />}
            fallbackClassName="bg-muted text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{business.name}</p>
            {business.headline ? (
              <p className="text-muted-foreground truncate text-sm">
                {business.headline}
              </p>
            ) : null}
          </div>
          {business.is_locked ? (
            <Badge variant="red" className="shrink-0">
              {t("locked.badge")}
            </Badge>
          ) : (
            <span className="text-muted-foreground hidden text-sm sm:inline">
              {typeLabel(business)}
            </span>
          )}
          <ChevronRight className="text-muted-foreground size-4 shrink-0" />
        </Link>
      </>
    );
  };

  // Drop fires once (dnd-kit) and only on an actual move, so the API PATCH goes out here directly.
  const reorder = (next: Business[]) => {
    const previous = businesses ?? [];
    setBusinesses(next);
    void fetch("/api/businesses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slugs: next.map((business) => business.slug) }),
    })
      .then(async (response) => {
        if (response.ok) {
          return;
        }
        setBusinesses(previous);
        const data = (await response.json().catch(() => null)) as {
          status?: string;
          retry_after?: number | null;
        } | null;
        const limit = parseRateLimit(response.status, data);
        if (limit) {
          notifyRateLimited(limit.retryAfter);
        } else {
          toast.error(t("reorderError"));
        }
      })
      .catch(() => {
        setBusinesses(previous);
        toast.error(t("reorderError"));
      });
  };

  if (businesses === null) {
    // Rate limited before the first load resolved — show the wait + auto-retry, not a forever skeleton.
    if (rateLimited !== null) {
      return (
        <RateLimited
          retryAfter={rateLimited}
          onRetry={() => {
            setRateLimited(null);
            void load();
          }}
        />
      );
    }
    // API unavailable on the first load — retry with backoff instead of a forever skeleton.
    if (unavailable) {
      return <ServiceUnavailable onRetry={() => void load()} />;
    }
    return (
      <ul className="divide-y">
        {[0, 1, 2].map((index) => (
          <li key={index} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="size-10 shrink-0 rounded-[22%]" />
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

  // A single business isn't reorderable — render it without a drag handle.
  if (businesses.length === 1) {
    const business = businesses[0]!;
    return (
      <div className="border-border/60 flex items-center gap-1 border-b">
        {rowBody(business, null)}
      </div>
    );
  }

  return (
    <SortableList
      items={businesses}
      getId={(business) => String(business.id)}
      onReorder={reorder}
      renderItem={(business, { setNodeRef, style, isDragging, handle }) => (
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "flex items-center gap-1",
            isDragging
              ? cn(placeholderClass, "py-3")
              : "border-border/60 border-b last:border-b-0",
          )}
        >
          <div
            className={cn(
              "flex flex-1 items-center gap-1",
              isDragging && "invisible",
            )}
          >
            {rowBody(
              business,
              <DragHandle
                ref={handle.ref}
                label={t("reorder")}
                className="ms-1"
                {...handle.attributes}
                {...handle.listeners}
              />,
            )}
          </div>
        </div>
      )}
      renderOverlay={(business) => (
        <div className={cn("flex items-center gap-1 py-1", overlayClass)}>
          {rowBody(business, <DragHandle label={t("reorder")} className="ms-1" />)}
        </div>
      )}
    />
  );
}
