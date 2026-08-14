"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Configure,
  InstantSearch,
  useClearRefinements,
  useHits,
  usePagination,
  useSearchBox,
  useStats,
} from "react-instantsearch";
import TypesenseInstantSearchAdapter from "typesense-instantsearch-adapter";

import { BusinessCard } from "@/components/business/public/business-card";
import { DirectoryMap } from "@/components/business/public/directory-map";
import { FacetList } from "@/components/business/public/facet-list";

import type { PublicBusinessCard } from "@/lib/public-business";

/** The Typesense document shape the `businesses` index returns. */
type DirectoryHit = {
  objectID: string;
  id: string;
  name: string;
  headline: string | null;
  type: PublicBusinessCard["type"];
  categories?: string[];
  city?: string;
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
    // The index has no logo (presigned URLs expire) — cards use the icon fallback for now.
    logo: null,
    city: hit.city ?? null,
    latitude: hit._geoloc?.lat ?? null,
    longitude: hit._geoloc?.lng ?? null,
    categories: (hit.categories ?? []).map((slug) => ({
      slug,
      name: categoryLabels[slug] ?? slug,
    })),
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
    <p className="text-muted-foreground text-sm">{t("count", { count: nbHits })}</p>
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

function Hits({ categoryLabels }: { categoryLabels: Record<string, string> }) {
  const t = useTranslations("businesses.directory");
  const { items } = useHits<DirectoryHit>();

  if (items.length === 0) {
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
        <BusinessCard key={hit.objectID} business={hitToCard(hit, categoryLabels)} />
      ))}
    </div>
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
function HitsMap({ categoryLabels }: { categoryLabels: Record<string, string> }) {
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
function Sidebar({ labels }: { labels: Labels }) {
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
      <FacetList attribute="categories" title={t("facetCategory")} labels={labels.categories} />
      <FacetList attribute="amenities" title={t("facetAmenities")} labels={labels.amenities} />
      <FacetList attribute="type" title={t("facetType")} labels={labels.types} />
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
export function Directory({ labels }: { labels: Labels }) {
  const t = useTranslations("businesses.directory");
  const [credentials, setCredentials] = useState<{
    key: string;
    host: string;
    expiresAt: number;
  } | null>(null);

  // Mint a scoped key on mount.
  useEffect(() => {
    let active = true;
    fetch("/api/search/key")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (active && data?.key) {
          setCredentials({ key: data.key, host: data.host, expiresAt: data.expires_at });
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
    const delay = Math.max(credentials.expiresAt * 1000 - Date.now() - 30_000, 10_000);
    const timer = setTimeout(() => {
      fetch("/api/search/key?refresh=1")
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => {
          if (data?.key) {
            setCredentials({ key: data.key, host: data.host, expiresAt: data.expires_at });
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
      additionalSearchParameters: { query_by: "name,headline" },
    });
    return adapter.searchClient;
  }, [credentials]);

  if (!searchClient) {
    return (
      <div className="bg-muted h-64 w-full animate-pulse rounded-2xl border" aria-hidden />
    );
  }

  return (
    <InstantSearch
      searchClient={searchClient}
      indexName="businesses"
      future={{ preserveSharedStateOnUnmount: true }}
    >
      <Configure hitsPerPage={24} />
      <div className="grid gap-8 lg:grid-cols-[220px_1fr_360px]">
        <Sidebar labels={labels} />
        <div>
          <div className="mb-4 max-w-xl">
            <SearchBox />
          </div>
          <div className="mb-4">
            <ResultCount />
          </div>
          <Hits categoryLabels={labels.categories} />
          <Pagination />
        </div>
        <HitsMap categoryLabels={labels.categories} />
      </div>
      <p className="sr-only">{t("title")}</p>
    </InstantSearch>
  );
}
