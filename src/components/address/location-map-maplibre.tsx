"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import "@/lib/map/maplibre-theme.css";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type * as MapLibre from "maplibre-gl";

import {
  collapseMaplibreAttribution,
  configureMaplibreWorker,
  OPENFREEMAP_STYLES,
  pinSvg,
} from "@/lib/map/engine";
import { cn } from "@/lib/utils";

function styleUrl(theme: string | undefined): string {
  return theme === "dark" ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light;
}

/** Build the DOM element for a brand pin marker. */
function pinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = pinSvg(30);
  return el;
}

/**
 * A small MapLibre GL map centered on a coordinate with a draggable pin, on OpenFreeMap's vector
 * `positron`/`dark` basemap. Dragging the pin — or tapping the map — reports the new latitude/longitude
 * through `onChange`, so a wrong geocode can be corrected by hand. Client-only (MapLibre touches
 * `window`), so it's imported dynamically inside an effect.
 */
export function LocationMap({
  latitude,
  longitude,
  onChange,
  interactive = true,
  className,
}: {
  latitude: number;
  longitude: number;
  /** Called with the new coordinate when the pin is dragged or the map tapped. Interactive only. */
  onChange?: (latitude: number, longitude: number) => void;
  /** When false, a static read-only thumbnail: no pan/zoom/drag, just the basemap and pin. */
  interactive?: boolean;
  /** Overrides the container sizing (defaults to the full-width editor map). */
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const markerRef = useRef<MapLibre.Marker | null>(null);
  const readyRef = useRef(false);
  // Keep the latest onChange without re-running the init effect.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const { resolvedTheme } = useTheme();
  // Pan/zoom follow `interactive`; the pin only moves when there's an `onChange` to report to — so an
  // enlarged read-only map can be panned and zoomed while its pin stays put.
  const editable = interactive && Boolean(onChange);

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const maplibregl = await import("maplibre-gl");
      configureMaplibreWorker(maplibregl);
      const container = containerRef.current;
      // Guard against React StrictMode's double-invoke re-initializing the same container.
      if (cancelled || !container || mapRef.current) {
        return;
      }
      const dark = document.documentElement.classList.contains("dark");
      const map = new maplibregl.Map({
        container,
        style: styleUrl(dark ? "dark" : "light"),
        center: [longitude, latitude],
        zoom: 15,
        // A read-only thumbnail freezes every interaction; the interactive map keeps them.
        interactive,
        scrollZoom: interactive,
        attributionControl: interactive ? { compact: true } : false,
      });
      if (interactive) {
        map.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
      }
      const marker = new maplibregl.Marker({
        element: pinElement(),
        anchor: "bottom",
        draggable: editable,
      })
        .setLngLat([longitude, latitude])
        .addTo(map);
      const report = (position: MapLibre.LngLat) =>
        onChangeRef.current?.(position.lat, position.lng);
      if (editable) {
        marker.on("dragend", () => report(marker.getLngLat()));
        map.on("click", (event: MapLibre.MapMouseEvent) => {
          marker.setLngLat(event.lngLat);
          report(event.lngLat);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
      map.on("load", () => {
        readyRef.current = true;
        collapseMaplibreAttribution(map.getContainer());
      });
    })();
    return () => {
      cancelled = true;
      readyRef.current = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Init once; external coordinate/theme changes are handled by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter the pin when the coordinate changes from outside (e.g. a new address is picked).
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) {
      return;
    }
    marker.setLngLat([longitude, latitude]);
    map.setCenter([longitude, latitude]);
  }, [latitude, longitude]);

  // Swap the basemap when the theme toggles.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) {
      return;
    }
    map.setStyle(styleUrl(resolvedTheme));
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden rounded-lg",
        className ?? "h-56 w-full",
        !interactive && "pointer-events-none",
      )}
    />
  );
}
