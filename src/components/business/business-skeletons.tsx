import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** A label + input placeholder, matching a `Field` in the real form. */
function FieldSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className={cn("w-full rounded-md", tall ? "h-24" : "h-10")} />
    </div>
  );
}

/** An "aside" section placeholder: title + description on the left, fields on the right. */
function SectionSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="border-border/60 grid gap-x-8 gap-y-4 border-t pt-10 md:grid-cols-3">
      <div className="space-y-2 md:col-span-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3.5 w-full max-w-52" />
        <Skeleton className="h-3.5 w-40" />
      </div>
      <div className="space-y-5 md:col-span-2">
        {Array.from({ length: fields }).map((_, index) => (
          <FieldSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading placeholder for the business detail form. Mirrors the real layout — header (logo, name,
 * type), the centered tab bar, and the aside form sections — so the page structure shows immediately
 * and only the content fills in. Shared by the workspace access check and the detail fetch, so the
 * skeleton stays put across both phases instead of a spinner giving way to a different skeleton.
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
          <div className="space-y-2 pt-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>

      {/* Tab bar: a centered pill row */}
      <div className="bg-muted mx-auto flex w-fit max-w-full gap-1 overflow-hidden rounded-lg p-1.5">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-md" />
        ))}
      </div>

      {/* First section (Basics): logo field on the left, fields on the right */}
      <div className="grid gap-x-8 gap-y-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Skeleton className="aspect-square w-full max-w-44 rounded-xl" />
        </div>
        <div className="space-y-5 md:col-span-2">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton tall />
        </div>
      </div>

      <SectionSkeleton />
      <SectionSkeleton fields={1} />
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
