import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A read-mode "view block": a small uppercase label over its value, matching `ViewBlock`. */
function ViewBlockSkeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-2.5 w-16" />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4", index === lines - 1 ? "w-2/3" : "w-full")}
        />
      ))}
    </div>
  );
}

/**
 * An "aside" section placeholder in READ mode: title + description on the left, a muted value tile on
 * the right — matching `FormSection`'s read layout and its divider (full width on mobile, only above
 * the fields column on desktop).
 */
function ReadSectionSkeleton({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "mt-8 grid gap-x-8 gap-y-3 md:grid-cols-3",
        "border-border/60 border-t pt-8",
        "md:border-t-0 md:pt-0",
        "md:[&>div:last-child]:border-border/60 md:[&>div:first-child]:pt-8 md:[&>div:last-child]:border-t md:[&>div:last-child]:pt-8",
      )}
    >
      <div className="md:col-span-1">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-2 h-3.5 w-full max-w-52" />
      </div>
      <div className="md:col-span-2">
        <div className="bg-muted/40 rounded-xl p-4">{children}</div>
      </div>
    </div>
  );
}

/**
 * Loading placeholder for the business (company information) page. Mirrors its INITIAL read view —
 * the header (logo, name, type), the centered tab bar, and the General tab's read sections as muted
 * value tiles — so the real page structure shows immediately and only the content fills in. Shared
 * by the workspace access check and the detail fetch, so the skeleton stays put across both phases
 * instead of a spinner giving way to a different skeleton.
 */
export function BusinessFormSkeleton() {
  return (
    <div className="space-y-8">
      {/* Back link */}
      <Skeleton className="h-4 w-36" />

      {/* Header: logo + name/type on the left, the action pill on the right */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-12 shrink-0 rounded-xl" />
          <div className="space-y-2 pt-0.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="size-11 rounded-full" />
      </div>

      {/* Tab bar: a centered pill row (seven tabs) */}
      <div className="bg-muted mx-auto flex w-fit max-w-full gap-1 overflow-hidden rounded-lg p-1.5">
        {Array.from({ length: 7 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-md" />
        ))}
      </div>

      {/* General → Basics: the logo on the left, the read value tile (headline + description) right. */}
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Skeleton className="aspect-square w-full max-w-44 rounded-xl" />
        </div>
        <div className="md:col-span-2">
          <div className="bg-muted/40 space-y-4 rounded-xl p-4">
            <ViewBlockSkeleton />
            <ViewBlockSkeleton lines={2} />
          </div>
        </div>
      </div>

      {/* Business type: a badge in its tile. */}
      <ReadSectionSkeleton>
        <Skeleton className="h-6 w-24 rounded-full" />
      </ReadSectionSkeleton>

      {/* Categories: a few chips in the tile. */}
      <ReadSectionSkeleton>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      </ReadSectionSkeleton>
    </div>
  );
}

/**
 * Loading placeholder for the business dashboard (the workspace home). Mirrors its header (logo +
 * name + subtitle) and the row of quick-link tiles.
 */
export function BusinessDashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-[72px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
