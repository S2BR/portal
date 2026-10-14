"use client";

import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdCard } from "@/components/marketplace/ad-card";
import { AdGridSkeleton } from "@/components/marketplace/ad-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdsPage, MarketplaceAd } from "@/lib/marketplace/types";

const SEARCH_DEBOUNCE_MS = 300;
/** Auto-load this many pages on scroll before falling back to a manual button. */
const AUTO_LOAD_PAGES = 5;

/**
 * The public marketplace directory: a searchable, load-more grid of ads. Seeded with the first page
 * (server-fetched), then fetches further pages from the BFF as the user searches or scrolls.
 */
export function MarketplaceBrowse({ initial }: { initial: AdsPage }) {
  const t = useTranslations("marketplace");
  const [ads, setAds] = useState<MarketplaceAd[]>(initial.data);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(initial.meta.current_page);
  const [lastPage, setLastPage] = useState(initial.meta.last_page);
  const [total, setTotal] = useState(initial.meta.total);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestRef = useRef(0);
  const didMount = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const hasMore = page < lastPage;

  const load = useCallback(
    async (opts: { q: string; page: number; append: boolean }) => {
      const id = ++requestRef.current;
      if (opts.append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const params = new URLSearchParams();
        if (opts.q) {
          params.set("q", opts.q);
        }
        if (opts.page > 1) {
          params.set("page", String(opts.page));
        }
        const res = await fetch(`/api/marketplace/ads?${params.toString()}`);
        const data = (await res.json()) as AdsPage;
        if (id !== requestRef.current) {
          return;
        }
        setAds((prev) => (opts.append ? [...prev, ...data.data] : data.data));
        setPage(data.meta.current_page);
        setLastPage(data.meta.last_page);
        setTotal(data.meta.total);
      } catch {
        // Keep whatever is already shown.
      } finally {
        if (id === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [],
  );

  // Debounced search (skips the initial mount — the first page is already seeded).
  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void load({ q: query, page: 1, append: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, load]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore && !loading) {
      void load({ q: query, page: page + 1, append: true });
    }
  }, [hasMore, loadingMore, loading, load, query, page]);

  // Auto-load the next few pages on scroll; past AUTO_LOAD_PAGES the user taps "Show more".
  useEffect(() => {
    if (!hasMore || page >= AUTO_LOAD_PAGES) {
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, page, loadMore]);

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("browse.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {loading ? (
        <AdGridSkeleton />
      ) : ads.length === 0 ? (
        <p className="text-muted-foreground py-16 text-center text-sm">
          {t("browse.empty")}
        </p>
      ) : (
        <>
          <p className="text-muted-foreground text-sm">
            {t("browse.count", { count: total })}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {ads.map((ad) => (
              <AdCard key={ad.id} ad={ad} />
            ))}
          </div>

          <div ref={sentinelRef} />

          {hasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {t("browse.loadMore")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
