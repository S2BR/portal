"use client";

import dynamic from "next/dynamic";

import { MAP_ENGINE } from "@/lib/map/engine";

import type { PublicBusinessCard } from "@/lib/public-business";

/**
 * The directory results map, rendered CLIENT-ONLY (the map libs touch `window`, so it must not SSR). A
 * `"use client"` wrapper so we can use `ssr: false`, which a Server Component can't. The engine is chosen
 * by the `NEXT_PUBLIC_MAP_ENGINE` flag: MapLibre + OpenFreeMap by default, Leaflet + CARTO when reverted.
 */
const DirectoryMapCanvas = dynamic(
  () =>
    MAP_ENGINE === "leaflet"
      ? import("@/components/business/public/directory-map-canvas").then(
          (module) => module.DirectoryMapCanvas,
        )
      : import("@/components/business/public/directory-map-canvas-maplibre").then(
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
