"use client";

import "leaflet/dist/leaflet.css";

import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";

import { cn } from "@/lib/utils";

import type { PublicBusinessCard } from "@/lib/public-business";

const TILES = {
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
};
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const PIN_HTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="color: var(--brand-green); filter: drop-shadow(0 1px 2px rgba(0,0,0,.35));"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" stroke="white" stroke-width="1.5"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg>`;

/** Escape a string for safe interpolation into a Leaflet popup's HTML. */
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

/**
 * A read-only Leaflet map of the directory results — one pin per business that has coordinates, each
 * with a popup linking to its profile. Fits the view to the pins. Client-only (Leaflet touches
 * `window`); loaded via a dynamic `ssr: false` wrapper.
 */
export function DirectoryMapCanvas({
  businesses,
  className,
}: {
  businesses: PublicBusinessCard[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const markersRef = useRef<Leaflet.LayerGroup | null>(null);
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
      const L = (await import("leaflet")).default;
      const container = containerRef.current;
      if (cancelled || !container || mapRef.current) {
        return;
      }
      const map = L.map(container, {
        center: [0, 0],
        zoom: 2,
        scrollWheelZoom: false,
      });
      const dark = document.documentElement.classList.contains("dark");
      tileRef.current = L.tileLayer(dark ? TILES.dark : TILES.light, {
        attribution: ATTRIBUTION,
        maxZoom: 19,
        subdomains: "abcd",
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      tileRef.current = null;
      markersRef.current = null;
    };
  }, []);

  // (Re)plot markers whenever the located results change.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      const layer = markersRef.current;
      if (cancelled || !map || !layer) {
        return;
      }
      layer.clearLayers();
      const icon = L.divIcon({
        className: "",
        html: PIN_HTML,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      const points: Leaflet.LatLngExpression[] = [];
      for (const business of located) {
        const point: Leaflet.LatLngExpression = [
          business.latitude as number,
          business.longitude as number,
        ];
        points.push(point);
        L.marker(point, { icon })
          .bindPopup(
            `<a href="/businesses/${encodeURIComponent(business.slug)}" style="font-weight:600;color:inherit">${escapeHtml(business.name)}</a>`,
          )
          .addTo(layer);
      }
      if (points.length === 1) {
        map.setView(points[0]!, 14);
      } else if (points.length > 1) {
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `signature` captures the located set
  }, [signature]);

  // Follow the app theme.
  useEffect(() => {
    tileRef.current?.setUrl(
      resolvedTheme === "dark" ? TILES.dark : TILES.light,
    );
  }, [resolvedTheme]);

  return (
    <div
      ref={containerRef}
      className={cn("bg-muted overflow-hidden rounded-2xl border", className)}
    />
  );
}
