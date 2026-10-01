"use client";

import dynamic from "next/dynamic";

import { MAP_ENGINE } from "@/lib/map/engine";

export type LocationMapProps = {
  latitude: number;
  longitude: number;
  /** Called with the new coordinate when the pin is dragged or the map tapped. Interactive only. */
  onChange?: (latitude: number, longitude: number) => void;
  /** When false, a static read-only thumbnail: no pan/zoom/drag, just the basemap and pin. */
  interactive?: boolean;
  /** Overrides the container sizing (defaults to the full-width editor map). */
  className?: string;
};

/**
 * Picks the location-map implementation by the `NEXT_PUBLIC_MAP_ENGINE` flag: MapLibre + OpenFreeMap by
 * default, the original Leaflet + CARTO map when set to "leaflet". Both expose the same props, so callers
 * import `LocationMap` from here and never touch the engine choice. Loaded per-engine so only the chosen
 * map's chunk (and its CSS) ships to the browser.
 */
const LocationMapImpl = dynamic<LocationMapProps>(
  () =>
    MAP_ENGINE === "leaflet"
      ? import("@/components/address/location-map").then((m) => m.LocationMap)
      : import("@/components/address/location-map-maplibre").then(
          (m) => m.LocationMap,
        ),
  { ssr: false },
);

export function LocationMap(props: LocationMapProps) {
  return <LocationMapImpl {...props} />;
}
