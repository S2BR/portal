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

import type { PublicBusinessCard } from "@/lib/public-business";

/** Escape a string for safe interpolation into a map popup's HTML. */
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

function styleUrl(theme: string | undefined): string {
  return theme === "dark" ? OPENFREEMAP_STYLES.dark : OPENFREEMAP_STYLES.light;
}

/** Build the DOM element for a brand pin marker. */
function pinElement(): HTMLDivElement {
  const el = document.createElement("div");
  el.innerHTML = pinSvg(28);
  el.style.cursor = "pointer";
  return el;
}

/**
 * A read-only MapLibre GL map of the directory results on OpenFreeMap's vector `positron`/`dark` basemap
 * — one pin per business that has coordinates, each with a popup linking to its profile. Fits the view
 * to the pins. Client-only (MapLibre touches `window`); loaded via a dynamic `ssr: false` wrapper.
 */
export function DirectoryMapCanvas({
  businesses,
  className,
}: {
  businesses: PublicBusinessCard[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibre.Map | null>(null);
  const markersRef = useRef<MapLibre.Marker[]>([]);
  const readyRef = useRef(false);
  const { resolvedTheme } = useTheme();

  const located = businesses.filter(
    (business) => business.latitude !== null && business.longitude !== null,
  );
  // A stable signature so the marker effect re-runs only when the located set actually changes.
  const signature = located
    .map((b) => `${b.slug}:${b.latitude},${b.longitude}`)
    .join("|");

  // Initialize the map once.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const maplibregl = await import("maplibre-gl");
      configureMaplibreWorker(maplibregl);
      const container = containerRef.current;
      if (cancelled || !container || mapRef.current) {
        return;
      }
      const dark = document.documentElement.classList.contains("dark");
      const map = new maplibregl.Map({
        container,
        style: styleUrl(dark ? "dark" : "light"),
        center: [0, 0],
        zoom: 1,
        attributionControl: { compact: true },
      });
      map.scrollZoom.disable();
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
      mapRef.current = map;
      map.on("load", () => {
        readyRef.current = true;
        collapseMaplibreAttribution(map.getContainer());
      });
    })();
    return () => {
      cancelled = true;
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];
      readyRef.current = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // (Re)plot markers whenever the located results change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const maplibregl = await import("maplibre-gl");
      const map = mapRef.current;
      if (cancelled || !map) {
        return;
      }
      for (const marker of markersRef.current) {
        marker.remove();
      }
      markersRef.current = [];

      const bounds = new maplibregl.LngLatBounds();
      for (const business of located) {
        const lngLat: [number, number] = [
          business.longitude as number,
          business.latitude as number,
        ];
        const popup = new maplibregl.Popup({ offset: 24 }).setHTML(
          `<a href="/businesses/${encodeURIComponent(business.slug)}" style="font-weight:600;color:inherit">${escapeHtml(business.name)}</a>`,
        );
        const marker = new maplibregl.Marker({
          element: pinElement(),
          anchor: "bottom",
        })
          .setLngLat(lngLat)
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
        bounds.extend(lngLat);
      }

      if (located.length === 1) {
        map.jumpTo({
          center: [
            located[0]!.longitude as number,
            located[0]!.latitude as number,
          ],
          zoom: 14,
        });
      } else if (located.length > 1) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, animate: false });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures the located set
  }, [signature]);

  // Follow the app theme by swapping the style. Markers are DOM overlays, so they persist across a
  // style change — no need to re-plot them.
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
      className={cn("bg-muted overflow-hidden rounded-2xl border", className)}
    />
  );
}
