"use client";

import dynamic from "next/dynamic";

import type { PublicBusinessCard } from "@/lib/public-business";

/**
 * The directory results map, rendered CLIENT-ONLY (Leaflet touches `window`, so it must not SSR). A
 * `"use client"` wrapper so we can use `ssr: false`, which a Server Component can't.
 */
const DirectoryMapCanvas = dynamic(
  () =>
    import("@/components/business/public/directory-map-canvas").then(
      (module) => module.DirectoryMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-full min-h-[420px] w-full animate-pulse rounded-2xl border" />
    ),
  },
);

export function DirectoryMap({
  businesses,
  className,
}: {
  businesses: PublicBusinessCard[];
  className?: string;
}) {
  return <DirectoryMapCanvas businesses={businesses} className={className} />;
}
