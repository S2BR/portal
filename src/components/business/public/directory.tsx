"use client";

import { MapPin, Navigation, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Configure,
  InstantSearch,
  useClearRefinements,
  useHits,
  usePagination,
  useSearchBox,
  useSortBy,
  useStats,
} from "react-instantsearch";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";

import { BusinessCard } from "@/components/business/public/business-card";
import { CategoryTree } from "@/components/business/public/category-tree";
import type { CategoryNode } from "@/components/business/public/category-tree-nodes";
import { DirectoryMap } from "@/components/business/public/directory-map";
import { FacetList } from "@/components/business/public/facet-list";
import { OpenNowToggle } from "@/components/business/public/open-now-toggle";
import { cn } from "@/lib/utils";
import {
  useDirectoryLocation,
  type DirectoryLocation,
  type LocationStatus,
} from "@/components/business/public/use-directory-location";

import type { EdgeLocation } from "@/lib/edge-location";
import type { PublicBusinessCard } from "@/lib/public-business";

/** The scoped Typesense search credentials (a short-lived, browser-safe key). */
type SearchCredentials = { key: string; host: string; expiresAt: number };

/** Build a Typesense InstantSearch client for the given scoped credentials. */
function buildTypesenseClient(credentials: SearchCredentials) {
  let host = credentials.host;
  let port = 443;
  let protocol = "https";
  try {
    const url = new URL(credentials.host);
    host = url.hostname;
    protocol = url.protocol.replace(":", "");
    port = url.port ? Number(url.port) : protocol === "https" ? 443 : 80;
  } catch {
    // credentials.host was a bare hostname — keep the https/443 defaults.
  }
  const adapter = new TypesenseInstantSearchAdapter({
    server: {
      apiKey: credentials.key,
      nodes: [{ host, port, protocol }],
      cacheSearchResultsForSeconds: 120,
    },
    geoLocationField: "location",
    additionalSearchParameters: {
      query_by: "name,headline,description",
      // Name > headline > a hit buried in the description; description stays out of the returned hits.
      query_by_weights: "4,2,1",
      exclude_fields: "description",
    },
  });
  return adapter.searchClient;
}

/** Whether a search error is a rejected/expired scoped key (Typesense 401/403) — the retry trigger. */
function isKeyExpiredError(error: unknown): boolean {
  const status = (error as { httpStatus?: number })?.httpStatus;
  if (status === 401 || status === 403) {
    return true;
  }
  const message = String(
    (error as { message?: string })?.message ?? error ?? "",
  );
  return /RequestUnauthorized|x-typesense-api-key|HTTP code (401|403)|Unauthorized|Forbidden/i.test(
    message,
  );
}

/** Great-circle distance between two coordinates, in metres. */
function distanceMeters(
  from: { latitude: number; longitude: number },
  toLat: number,
  toLng: number,
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(toLat - from.latitude);
  const dLng = toRad(toLng - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) *
      Math.cos(toRad(toLat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** The Typesense document shape the `businesses` index returns. */
type DirectoryHit = {
  objectID: string;
  id: string;
  name: string;
  headline: string | null;
  type: PublicBusinessCard["type"];
  categories?: string[];
  city?: string;
  // Presigned logo + banner urls, kept fresh by the nightly re-index; absent when the business
  // has none (the API only indexes the keys when set).
  logo?: string;
  banner?: string;
  rating_avg?: number;
  rating_count?: number;
  _geoloc?: { lat: number; lng: number };
};

/** Slugify a name the same way the API does, so a card links straight to the canonical profile URL. */
function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function hitToCard(
  hit: DirectoryHit,
  categoryLabels: Record<string, string>,
): PublicBusinessCard {
  return {
    id: hit.id,
    slug: `${slugify(hit.name)}-${hit.id}`,
    name: hit.name,
    type: hit.type,
    headline: hit.headline ?? null,
    logo: hit.logo ?? null,
    banner: hit.banner ?? null,
    city: hit.city ?? null,
    latitude: hit._geoloc?.lat ?? null,
    longitude: hit._geoloc?.lng ?? null,
    categories: (hit.categories ?? []).map((slug) => ({
      slug,
      name: categoryLabels[slug] ?? slug,
    })),
    rating_avg: hit.rating_avg ?? 0,
    rating_count: hit.rating_count ?? 0,
  };
}

type Labels = {
  categories: Record<string, string>;
  amenities: Record<string, string>;
  types: Record<string, string>;
};

/** The search box — instant, no debounce (InstantSearch searches on every keystroke). */
function SearchBox() {
  const t = useTranslations("businesses.directory");
  const { query, refine } = useSearchBox();
  return (
    <div className="border-input bg-background focus-within:ring-ring flex items-center gap-2 rounded-xl border px-3.5 py-2.5 focus-within:ring-2">
      <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
      <input
        type="search"
        value={query}
        onChange={(event) => refine(event.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchPlaceholder")}
        className="placeholder:text-muted-foreground w-full bg-transparent text-sm outline-none"
      />
    </div>
  );
}

function ResultCount() {
  const t = useTranslations("businesses.directory");
  const { nbHits } = useStats();
  return (
    <p className="text-muted-foreground text-sm">
      {t("count", { count: nbHits })}
    </p>
  );
}

function ClearFilters() {
  const t = useTranslations("businesses.directory");
  const { canRefine, refine } = useClearRefinements();
  if (!canRefine) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={refine}
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs font-medium"
    >
      <X className="size-3.5" />
      {t("clearFilters")}
    </button>
  );
}

function Hits({
  categoryLabels,
  location,
  nearMeRadius,
  onClearRadius,
}: {
  categoryLabels: Record<string, string>;
  location: DirectoryLocation | null;
  nearMeRadius: number | null;
  onClearRadius: () => void;
}) {
  const t = useTranslations("businesses.directory");
  const { items } = useHits<DirectoryHit>();

  const distanceLabel = (hit: DirectoryHit): string | undefined => {
    if (!location || !hit._geoloc) {
      return undefined;
    }
    const meters = distanceMeters(location, hit._geoloc.lat, hit._geoloc.lng);
    return meters < 1000
      ? t("distanceM", { m: Math.round(meters) })
      : t("distanceKm", { km: (meters / 1000).toFixed(1) });
  };

  if (items.length === 0) {
    // When "near me" is filtering by radius, say so and offer a way out — an empty page would
    // otherwise look broken for a visitor who's simply far from every listed business.
    if (nearMeRadius) {
      return (
        <div className="rounded-2xl border border-dashed py-16 text-center">
          <p className="font-medium">{t("noneNearbyTitle")}</p>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("noneNearbyBody", { km: nearMeRadius })}
          </p>
          <button
            type="button"
            onClick={onClearRadius}
            className="border-input hover:bg-accent mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
          >
            {t("showAll")}
          </button>
        </div>
      );
    }
    return (
      <div className="rounded-2xl border border-dashed py-16 text-center">
        <p className="font-medium">{t("emptyTitle")}</p>
        <p className="text-muted-foreground mt-1 text-sm">{t("emptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {items.map((hit) => (
        <BusinessCard
          key={hit.objectID}
          business={hitToCard(hit, categoryLabels)}
          distanceLabel={distanceLabel(hit)}
        />
      ))}
    </div>
  );
}

/**
 * The "near me" control + geo sort. Once a location is available (GPS or the IP fallback) it sorts
 * results nearest-first and shows a chip naming the source; turning it off returns to the default
 * order. Wired to InstantSearch via `useSortBy` (the value is a Typesense geo-sort index).
 */
function NearMeControl({
  location,
  status,
  geoIndex,
  onTurnOff,
  onEnable,
}: {
  location: DirectoryLocation | null;
  status: LocationStatus;
  geoIndex: string | null;
  onTurnOff: () => void;
  onEnable: () => void;
}) {
  const t = useTranslations("businesses.directory");
  const { refine, currentRefinement } = useSortBy({
    items: [
      { label: "relevance", value: "businesses" },
      ...(geoIndex ? [{ label: "nearest", value: geoIndex }] : []),
    ],
  });

  // Sort by distance as soon as a location is available.
  useEffect(() => {
    if (geoIndex && currentRefinement !== geoIndex) {
      refine(geoIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refine only when geoIndex changes
  }, [geoIndex]);

  if (location) {
    return (
      <span className="border-brand-green/40 bg-brand-green/5 text-foreground inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium">
        <MapPin className="text-brand-green size-3.5" aria-hidden />
        {t(location.source === "gps" ? "nearYouExact" : "nearYouApprox")}
        <button
          type="button"
          onClick={() => {
            refine("businesses");
            onTurnOff();
          }}
          className="text-muted-foreground hover:text-foreground -mr-1 inline-flex items-center"
          aria-label={t("turnOff")}
        >
          <X className="size-3.5" />
        </button>
      </span>
    );
  }

  const blocked = status === "denied" || status === "unavailable";
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={onEnable}
        disabled={status === "locating"}
        className="border-input hover:bg-accent inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60"
      >
        <Navigation className="size-3.5" aria-hidden />
        {status === "locating" ? t("locating") : t("nearMe")}
      </button>
      {blocked ? (
        <span className="text-muted-foreground text-xs">
          {t("locationBlocked")}
        </span>
      ) : null}
    </span>
  );
}

/** The near-me radius selector — filter to businesses within a distance, or "Any" to only sort. */
function RadiusPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  const t = useTranslations("businesses.directory");
  const options: (number | null)[] = [10, 25, 50, 100, null];
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground mr-1 text-xs">{t("within")}</span>
      {options.map((option) => (
        <button
          key={option ?? "any"}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
            value === option
              ? "border-brand-green/40 bg-brand-green/10 text-foreground"
              : "border-input text-muted-foreground hover:bg-accent",
          )}
        >
          {option === null ? t("anyDistance") : t("distanceKm", { km: option })}
        </button>
      ))}
    </span>
  );
}

function Pagination() {
  const t = useTranslations("businesses.directory");
  const { currentRefinement, nbPages, isFirstPage, isLastPage, refine } =
    usePagination();
  if (nbPages <= 1) {
    return null;
  }
  return (
    <nav
      className="mt-8 flex items-center justify-between gap-4"
      aria-label={t("pagination")}
    >
      <button
        type="button"
        disabled={isFirstPage}
        onClick={() => refine(currentRefinement - 1)}
        className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {t("previous")}
      </button>
      <span className="text-muted-foreground text-sm">
        {t("pageOf", { current: currentRefinement + 1, total: nbPages })}
      </span>
      <button
        type="button"
        disabled={isLastPage}
        onClick={() => refine(currentRefinement + 1)}
        className="hover:bg-accent rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40"
      >
        {t("next")}
      </button>
    </nav>
  );
}

/** The map, fed by the current hits that carry coordinates. */
function HitsMap({
  categoryLabels,
}: {
  categoryLabels: Record<string, string>;
}) {
  const t = useTranslations("businesses.directory");
  const { items } = useHits<DirectoryHit>();
  const located = items
    .filter((hit) => hit._geoloc)
    .map((hit) => hitToCard(hit, categoryLabels));

  if (located.length === 0) {
    return null;
  }
  return (
    <aside className="hidden lg:block" aria-label={t("mapLabel")}>
      <div className="sticky top-4">
        <DirectoryMap businesses={located} className="h-[calc(100svh-9rem)]" />
      </div>
    </aside>
  );
}

/** The faceted sidebar. */
function Sidebar({
  labels,
  categoryTree,
}: {
  labels: Labels;
  categoryTree: CategoryNode[];
}) {
  const t = useTranslations("businesses.directory");
  return (
    <aside className="space-y-8">
      <div className="flex items-center justify-between px-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" aria-hidden />
          {t("filters")}
        </h2>
        <ClearFilters />
      </div>
      <OpenNowToggle />
      <CategoryTree title={t("facetCategory")} tree={categoryTree} />
      <FacetList
        attribute="amenities"
        title={t("facetAmenities")}
        labels={labels.amenities}
      />
      <FacetList
        attribute="type"
        title={t("facetType")}
        labels={labels.types}
      />
      <FacetList attribute="city" title={t("facetCity")} />
    </aside>
  );
}

/**
 * The public business directory as an InstantSearch app: the browser searches Typesense DIRECTLY with
 * a scoped key minted (once) from `/api/search/key`, so typing never touches Laravel. Instant results,
 * a faceted sidebar (only values with matches), and a live map — mirroring the mobile app's
 * direct-to-Typesense model.
 */
export function Directory({
  labels,
  categoryTree,
  ipLocation,
}: {
  labels: Labels;
  categoryTree: CategoryNode[];
  ipLocation: EdgeLocation | null;
}) {
  const t = useTranslations("businesses.directory");
  const { location, status, turnOff, enable } =
    useDirectoryLocation(ipLocation);
  const geoIndex = location
    ? `businesses/sort/location(${location.latitude}, ${location.longitude}):asc`
    : null;
  // Near-me radius in km (null = "Any": sort by distance but don't filter). Defaults to a metro-sized
  // radius so "near me" actually narrows to what's around you.
  const [radiusKm, setRadiusKm] = useState<number | null>(50);
  const [credentials, setCredentials] = useState<SearchCredentials | null>(
    null,
  );

  // Mint a scoped key on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/search/key")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.key) {
          setCredentials({
            key: data.key,
            host: data.host,
            expiresAt: data.expires_at,
          });
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Re-mint ~30s before the key expires so searches never fail mid-session.
  useEffect(() => {
    if (!credentials) {
      return;
    }
    const delay = Math.max(
      credentials.expiresAt * 1000 - Date.now() - 30_000,
      10_000,
    );
    const timer = setTimeout(() => {
      fetch("/api/search/key?refresh=1")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.key) {
            setCredentials({
              key: data.key,
              host: data.host,
              expiresAt: data.expires_at,
            });
          }
        })
        .catch(() => {});
    }, delay);
    return () => clearTimeout(timer);
  }, [credentials]);

  const searchClient = useMemo(() => {
    if (!credentials) {
      return null;
    }
    // A mutable local (captured by the closures below) holds the live client, so a retry uses the
    // freshly re-minted key without touching a ref during render.
    let current = buildTypesenseClient(credentials);

    // Single-flight re-mint: many InstantSearch requests can fail at once when the key lapses, but
    // they should all share ONE new key rather than each minting their own.
    let reminting: Promise<boolean> | null = null;
    const remint = (): Promise<boolean> => {
      reminting ??= fetch("/api/search/key?refresh=1")
        .then((response) => (response.ok ? response.json() : null))
        .then(
          (
            data: { key?: string; host?: string; expires_at?: number } | null,
          ) => {
            if (!data?.key || !data.host || !data.expires_at) {
              return false;
            }
            const fresh: SearchCredentials = {
              key: data.key,
              host: data.host,
              expiresAt: data.expires_at,
            };
            current = buildTypesenseClient(fresh);
            setCredentials(fresh); // resets the proactive timer + the memo
            return true;
          },
        )
        .catch(() => false)
        .finally(() => {
          reminting = null;
        });
      return reminting;
    };

    // A scoped key can expire while the tab is idle/backgrounded (the proactive timer gets throttled),
    // so a direct-to-Typesense search 401s. Catch it, re-mint transparently, and retry once — the user
    // just waits a beat longer, then sees results, instead of an uncaught error. (The client's `search`
    // is overloaded, so we invoke it through a loose callable; the outer cast restores the real type.)
    const search = async (requests: unknown) => {
      const run = () =>
        (current.search as unknown as (r: unknown) => Promise<unknown>)(
          requests,
        );
      try {
        return await run();
      } catch (error) {
        if (!isKeyExpiredError(error) || !(await remint())) {
          throw error;
        }
        return await run();
      }
    };

    // Same client shape as `base`, just with the self-healing `search` — cast so InstantSearch's
    // searchClient prop accepts it exactly as it did the raw adapter client.
    return { ...current, search } as unknown as typeof current;
  }, [credentials]);

  if (!searchClient) {
    return (
      <div
        className="bg-muted h-64 w-full animate-pulse rounded-2xl border"
        aria-hidden
      />
    );
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="businesses"
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure
        hitsPerPage={24}
        {...(location && radiusKm
          ? {
              aroundLatLng: `${location.latitude}, ${location.longitude}`,
              aroundRadius: radiusKm * 1000,
            }
          : {})}
      />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr_360px]">
        <Sidebar labels={labels} categoryTree={categoryTree} />
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="max-w-xl flex-1">
              <SearchBox />
            </div>
            <NearMeControl
              location={location}
              status={status}
              geoIndex={geoIndex}
              onTurnOff={turnOff}
              onEnable={enable}
            />
          </div>
          {location ? (
            <div className="mb-4">
              <RadiusPicker value={radiusKm} onChange={setRadiusKm} />
            </div>
          ) : null}
          <div className="mb-4">
            <ResultCount />
          </div>
          <Hits
            categoryLabels={labels.categories}
            location={location}
            nearMeRadius={location ? radiusKm : null}
            onClearRadius={() => setRadiusKm(null)}
          />
          <Pagination />
        </div>
        <HitsMap categoryLabels={labels.categories} />
      </div>
      <p className="sr-only">{t("title")}</p>
    </InstantSearch>
  );
}
