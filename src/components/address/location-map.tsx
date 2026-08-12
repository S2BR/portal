"use client";

import "leaflet/dist/leaflet.css";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";

import { cn } from "@/lib/utils";

/**
 * CARTO Positron basemap that follows the app's light/dark theme — the same muted basemap the mobile
 * app uses (light_all / dark_all) rather than the colorful default OpenStreetMap tiles.
 */
const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/** A teardrop pin in the brand color (via currentColor) with a white outline so it reads on both
 *  the light and dark basemaps. */
const PIN_HTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" style="color: var(--brand-green); filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" stroke="white" stroke-width="1.5"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg>`;

/**
 * A small Leaflet map centered on a coordinate with a draggable pin. Dragging the pin — or tapping the
 * map — reports the new latitude/longitude through `onChange`, so a wrong geocode can be corrected by
 * hand. Client-only (Leaflet touches `window`), so it's imported dynamically inside an effect.
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
  const mapRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
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
      const L = (await import("leaflet")).default;
      const container = containerRef.current;
      // Guard against React StrictMode's double-invoke re-initializing the same container.
      if (cancelled || !container || mapRef.current) {
        return;
      }
      const map = L.map(container, {
        center: [latitude, longitude],
        zoom: 15,
        // Trackpad/wheel zoom on the interactive maps; the static thumbnail stays frozen.
        scrollWheelZoom: interactive,
        // A read-only thumbnail: freeze every interaction and drop the controls.
        zoomControl: interactive,
        dragging: interactive,
        doubleClickZoom: interactive,
        boxZoom: interactive,
        keyboard: interactive,
        touchZoom: interactive,
        attributionControl: interactive,
      });
      const dark = document.documentElement.classList.contains("dark");
      const tile = L.tileLayer(dark ? TILES.dark : TILES.light, {
        attribution: ATTRIBUTION,
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
      const icon = L.divIcon({
        className: "",
        html: PIN_HTML,
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });
      const marker = L.marker([latitude, longitude], {
        draggable: editable,
        icon,
      }).addTo(map);
      const report = (position: Leaflet.LatLng) =>
        onChangeRef.current?.(position.lat, position.lng);
      if (editable) {
        marker.on("dragend", () => report(marker.getLatLng()));
        map.on("click", (event: Leaflet.LeafletMouseEvent) => {
          marker.setLatLng(event.latlng);
          report(event.latlng);
        });
      }

      mapRef.current = map;
      markerRef.current = marker;
      tileRef.current = tile;
      // The container is often laid out (dialog/tab) after mount — recompute once visible.
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileRef.current = null;
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
    marker.setLatLng([latitude, longitude]);
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude]);

  // Swap the basemap when the theme toggles.
  useEffect(() => {
    tileRef.current?.setUrl(
      resolvedTheme === "dark" ? TILES.dark : TILES.light,
    );
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
