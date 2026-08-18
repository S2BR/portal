"use client";

import { Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/auth/user-avatar";
import { ReviewForm } from "@/components/business/public/review-form";
import { StarRating } from "@/components/business/public/star-rating";
import { ReportDialog } from "@/components/moderation/report-dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type {
  PublicReview,
  PublicReviewsPage,
  ReviewSort,
  ReviewSummary,
} from "@/lib/public-business";

const SORTS: ReviewSort[] = ["recent", "oldest", "highest", "lowest"];
const STARS = [5, 4, 3, 2, 1];

/**
 * Infinite-scroll auto-loads reviews up to this many, then hands off to a manual "Show more" — a cap
 * so a single view can't fetch unbounded pages in the background. Override per environment via
 * NEXT_PUBLIC_REVIEWS_AUTOLOAD_LIMIT; a fresh sort/filter starts the count over.
 */
const AUTO_LOAD_LIMIT =
  Number(process.env.NEXT_PUBLIC_REVIEWS_AUTOLOAD_LIMIT) || 120;

const EMPTY_SUMMARY: ReviewSummary = {
  avg: 0,
  count: 0,
  breakdown: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 },
};

/**
 * The dedicated reviews page body: a write-a-review block, a rating summary with a clickable 5→1
 * histogram (tap a bar to filter to that star), a sort control, and the paginated list. The summary
 * reflects every visible review regardless of the active filter; changing the sort or filter
 * re-fetches page 1, and a successful write refreshes both.
 */
export function BusinessReviews({
  slug,
  initial,
}: {
  slug: string;
  initial: PublicReviewsPage;
}) {
  const t = useTranslations("businesses.public.reviews");
  const format = useFormatter();

  const [reviews, setReviews] = useState<PublicReview[]>(initial.data);
  const [summary, setSummary] = useState<ReviewSummary>(
    initial.rating ?? EMPTY_SUMMARY,
  );
  const [sort, setSort] = useState<ReviewSort>("recent");
  const [activeRating, setActiveRating] = useState<number | null>(null);
  const [page, setPage] = useState(initial.meta.current_page);
  const [lastPage, setLastPage] = useState(initial.meta.last_page);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Guards a stale response from a slower earlier request overwriting a newer one.
  const requestId = useRef(0);

  const hasMore = page < lastPage;
  // Auto-load (infinite scroll) only while under the cap; past it, a manual "Show more" takes over.
  const autoLoad = hasMore && reviews.length < AUTO_LOAD_LIMIT;

  // A sentinel near the list's end; when it scrolls into view we fetch the next page. `loadMoreRef`
  // keeps the observer pointed at the latest closure without re-creating it every render.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });

  useEffect(() => {
    if (!autoLoad || loadingMore) {
      return;
    }
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMoreRef.current();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [autoLoad, loadingMore]);

  async function fetchPage(
    nextSort: ReviewSort,
    nextRating: number | null,
    nextPage: number,
  ): Promise<PublicReviewsPage | null> {
    const query = new URLSearchParams();
    if (nextPage > 1) {
      query.set("page", String(nextPage));
    }
    if (nextSort !== "recent") {
      query.set("sort", nextSort);
    }
    if (nextRating) {
      query.set("rating", String(nextRating));
    }
    const suffix = query.toString();
    const response = await fetch(
      `/api/businesses/${encodeURIComponent(slug)}/reviews${suffix ? `?${suffix}` : ""}`,
    );
    return (await response.json()) as PublicReviewsPage;
  }

  async function reload(nextSort: ReviewSort, nextRating: number | null) {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const data = await fetchPage(nextSort, nextRating, 1);
      if (!data || id !== requestId.current) {
        return;
      }
      setReviews(data.data);
      setPage(data.meta.current_page);
      setLastPage(data.meta.last_page);
      if (data.rating) {
        setSummary(data.rating);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      if (id === requestId.current) {
        setLoading(false);
      }
    }
  }

  function changeSort(next: ReviewSort) {
    setSort(next);
    void reload(next, activeRating);
  }

  function toggleRating(star: number) {
    const next = activeRating === star ? null : star;
    setActiveRating(next);
    void reload(sort, next);
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const data = await fetchPage(sort, activeRating, page + 1);
      if (data) {
        setReviews((current) => [...current, ...data.data]);
        setPage(data.meta.current_page);
        setLastPage(data.meta.last_page);
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setLoadingMore(false);
    }
  }

  const maxBar = Math.max(
    1,
    ...STARS.map((star) => summary.breakdown[String(star)] ?? 0),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
      {/* Reviews list — the main column. */}
      <section className="order-2 min-w-0 lg:order-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("allReviews")}</h2>
          <div className="flex items-center gap-2">
            {activeRating ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleRating(activeRating)}
              >
                {t("showAll")}
              </Button>
            ) : null}
            <Select
              value={sort}
              onValueChange={(value) => changeSort(value as ReviewSort)}
            >
              <SelectTrigger
                className="h-9 w-[170px]"
                aria-label={t("sortLabel")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {t(`sort.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className={cn("divide-y", loading && "opacity-60")}>
            {reviews.map((review) => (
              <li key={review.id} className="py-4">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={review.reviewer.name ?? "?"}
                    src={review.reviewer.avatar}
                    className="size-9"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {review.reviewer.name}
                      </span>
                      <StarRating value={review.rating} size={14} />
                      {review.created_at ? (
                        <span className="text-muted-foreground text-xs">
                          {format.dateTime(new Date(review.created_at), {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      ) : null}
                    </div>
                    {review.body ? (
                      <p className="mt-1.5 text-sm text-pretty">
                        {review.body}
                      </p>
                    ) : null}
                    {review.owner_reply ? (
                      <div className="bg-muted/50 mt-2.5 rounded-lg border p-3">
                        <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                          {t("ownerReply")}
                        </p>
                        <p className="mt-1 text-sm text-pretty">
                          {review.owner_reply}
                        </p>
                      </div>
                    ) : null}
                    <ReportDialog
                      type="review"
                      id={review.id}
                      label={t("report")}
                      className="mt-2 inline-block"
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {hasMore ? (
          autoLoad ? (
            // Infinite scroll: this sentinel triggers the next page as it nears the viewport.
            <div ref={sentinelRef} className="mt-4 flex justify-center py-2">
              {loadingMore ? (
                <Loader2
                  className="text-muted-foreground size-5 animate-spin"
                  aria-hidden
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {t("loadMore")}
              </Button>
            </div>
          )
        ) : null}
      </section>

      {/* Write a review + the rating summary — a sidebar that sticks on desktop, stacks on top on
          mobile so the "leave a review" call to action stays above the fold. */}
      <aside className="order-1 space-y-6 lg:sticky lg:top-24 lg:order-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t("leaveReview")}</h2>
          <ReviewForm slug={slug} onSaved={() => reload(sort, activeRating)} />
        </section>

        {summary.count > 0 ? (
          <section className="bg-card rounded-2xl border p-5">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-semibold tabular-nums">
                {summary.avg.toFixed(1)}
              </span>
              <StarRating value={summary.avg} size={18} className="mt-1.5" />
              <span className="text-muted-foreground mt-1 text-xs">
                {t("count", { count: summary.count })}
              </span>
            </div>
            <div className="mt-4 space-y-1.5">
              {STARS.map((star) => {
                const count = summary.breakdown[String(star)] ?? 0;
                const active = activeRating === star;
                return (
                  <button
                    key={star}
                    type="button"
                    aria-pressed={active}
                    aria-label={t("filterByStars", { star })}
                    onClick={() => toggleRating(star)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-md px-2 py-1 text-sm transition-colors",
                      active ? "bg-muted" : "hover:bg-muted/60",
                    )}
                  >
                    <span className="text-muted-foreground w-3 text-right tabular-nums">
                      {star}
                    </span>
                    <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-brand-gold block h-full rounded-full"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-8 text-right tabular-nums">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}
