import { Skeleton } from "@/components/ui/skeleton";

/** A card-shaped loading placeholder, matching the real ad card. */
function AdCardSkeleton() {
  return (
    <div className="bg-card flex flex-col overflow-hidden rounded-2xl border">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

/** A grid of card skeletons for the browse loading state. */
export function AdGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <AdCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** Row-shaped skeletons for the "my ads" list loading state. */
export function MyAdsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="divide-y rounded-xl border">
      {Array.from({ length: count }).map((_, index) => (
        <li key={index} className="flex items-center gap-4 p-3">
          <Skeleton className="size-16 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="size-8 rounded-md" />
        </li>
      ))}
    </ul>
  );
}
