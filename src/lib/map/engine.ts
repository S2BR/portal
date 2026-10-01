/**
 * Which map renderer the app uses. We keep two interchangeable implementations:
 *
 *   - "maplibre" (default) — MapLibre GL + OpenFreeMap vector tiles (the `positron` / `dark` styles).
 *     Same muted Positron look, but the tiles are free, key-less, rate-limit-free OSM data, so we no
 *     longer depend on CARTO (which now wants an API key and has volume limits).
 *   - "leaflet" — the original Leaflet raster map on CARTO Positron tiles. Kept intact so we can revert
 *     instantly by flipping the flag, with no code change.
 *
 * Flip with `NEXT_PUBLIC_MAP_ENGINE=leaflet` (anything else, or unset, means MapLibre). It's a build-time
 * public env var, so it's inlined into the client bundle.
 */
export type MapEngine = "maplibre" | "leaflet";

export const MAP_ENGINE: MapEngine =
  process.env.NEXT_PUBLIC_MAP_ENGINE === "leaflet" ? "leaflet" : "maplibre";

/**
 * OpenFreeMap style URLs (vector). `positron` and `dark` mirror the CARTO light_all / dark_all basemaps
 * we were using, so the map keeps the same muted palette.
 */
export const OPENFREEMAP_STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const;

/**
 * Point MapLibre at a statically-served copy of its web worker (and the shared chunk it imports), under
 * `/public/maplibre`. MapLibre otherwise resolves the worker relative to its own bundled chunk URL, which
 * Next's bundler (Turbopack) never emits as a fetchable file — so the worker 404s and the map renders no
 * tiles. Serving the worker ourselves and setting the URL fixes it. Idempotent; safe to call per-map.
 */
let workerConfigured = false;
export function configureMaplibreWorker(maplibregl: {
  setWorkerUrl: (url: string) => void;
}): void {
  if (workerConfigured) {
    return;
  }
  maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
  workerConfigured = true;
}

/**
 * Collapse MapLibre's compact attribution to just its (i) button. MapLibre initializes a compact
 * attribution in the *expanded* state (it adds both `maplibregl-compact` and `maplibregl-compact-show`),
 * so we strip the "show" class once after load — a later resize won't re-add it, and the user can still
 * click the (i) to reveal the credit. Pass the map's own container so we only touch this map's control.
 */
export function collapseMaplibreAttribution(container: HTMLElement): void {
  const attrib = container.querySelector(".maplibregl-ctrl-attrib");
  if (attrib) {
    attrib.classList.remove("maplibregl-compact-show");
    attrib.removeAttribute("open");
  }
}

/** The brand teardrop pin, shared by both map engines (color via `--brand-green`, white outline so it
 *  reads on light and dark basemaps). Width/height are substituted so each map can size its own pin. */
export function pinSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" style="color: var(--brand-green); filter: drop-shadow(0 1px 2px rgba(0,0,0,.35)); cursor: inherit;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" stroke="white" stroke-width="1.5"/><circle cx="12" cy="9" r="2.6" fill="white"/></svg>`;
}
