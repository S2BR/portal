"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import { UserAvatar } from "@/components/auth/user-avatar";
import { StarRating } from "@/components/business/public/star-rating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import type { PublicReview, PublicReviewsPage } from "@/lib/public-business";

/**
 * The Reviews section on a public profile. Signed-in visitors write/edit/delete their own review
 * (one per business); everyone sees the list with the owner's replies and can report abuse. Page 1
 * comes from the server (`initial`); "show more" appends further pages, and a write re-fetches the
 * server data (list + header aggregate) via router.refresh().
 */
export function ReviewsSection({
  slug,
  initial,
  ratingCount,
}: {
  slug: string;
  initial: PublicReviewsPage;
  ratingCount: number;
}) {
  const t = useTranslations("businesses.public.reviews");
  const router = useRouter();
  const { user } = useCurrentUser();

  const [more, setMore] = useState<PublicReview[]>([]);
  const [page, setPage] = useState(initial.meta.current_page);
  const [lastPage, setLastPage] = useState(initial.meta.last_page);
  const [loadingMore, setLoadingMore] = useState(false);

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [hasReview, setHasReview] = useState(false);
  const [busy, setBusy] = useState(false);

  // A write re-fetches page 1 from the server (a new `initial`); reset the appended pages to match.
  // Adjusting state during render (not in an effect) is React's recommended reset-on-prop-change.
  const [seenInitial, setSeenInitial] = useState(initial);
  if (seenInitial !== initial) {
    setSeenInitial(initial);
    setMore([]);
    setPage(initial.meta.current_page);
    setLastPage(initial.meta.last_page);
  }

  // Prefill the form from the signed-in user's existing review.
  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    void fetch(`/api/businesses/${encodeURIComponent(slug)}/review`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { review?: { rating: number; body: string | null } } | null) => {
        if (active && data?.review) {
          setRating(data.review.rating);
          setBody(data.review.body ?? "");
          setHasReview(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, slug]);

  const reviews = [...initial.data, ...more];

  async function submit() {
    if (rating < 1) {
      toast.error(t("ratingRequired"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(slug)}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body: body.trim() || null }),
      });
      const data = (await response.json()) as { status?: string; message?: string };
      if (data.status === "ok") {
        setHasReview(true);
        toast.success(t("saved"));
        router.refresh();
      } else if (data.status === "forbidden") {
        toast.error(data.message ?? t("cannotReviewOwn"));
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const response = await fetch(`/api/businesses/${encodeURIComponent(slug)}/review`, {
        method: "DELETE",
      });
      if (response.ok) {
        setHasReview(false);
        setRating(0);
        setBody("");
        toast.success(t("removed"));
        router.refresh();
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/reviews?page=${next}`,
      );
      const data = (await response.json()) as PublicReviewsPage;
      setMore((current) => [...current, ...data.data]);
      setPage(data.meta.current_page);
      setLastPage(data.meta.last_page);
    } catch {
      toast.error(t("error"));
    } finally {
      setLoadingMore(false);
    }
  }

  async function report(id: string) {
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(id)}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: "other" }),
        },
      );
      toast[response.ok ? "success" : "error"](
        response.ok ? t("reported") : t("error"),
      );
    } catch {
      toast.error(t("error"));
    }
  }

  return (
    <section>
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
        {t("title")}
        {ratingCount > 0 ? (
          <span className="ml-1.5 tabular-nums normal-case">({ratingCount})</span>
        ) : null}
      </h2>

      {/* Write / edit your review — or a sign-in prompt. */}
      <div className="bg-muted/40 mt-3 rounded-2xl border p-5">
        {user ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">
              {hasReview ? t("yourReview") : t("writeTitle")}
            </p>
            <div
              className="flex items-center gap-1"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={t("stars", { count: n })}
                  disabled={busy}
                  onMouseEnter={() => setHover(n)}
                  onClick={() => setRating(n)}
                  className="focus-visible:ring-ring rounded p-0.5 focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Star
                    className={cn(
                      "size-7 transition-colors",
                      (hover || rating) >= n
                        ? "text-brand-gold fill-current stroke-0"
                        : "text-muted-foreground/30 fill-current stroke-0",
                    )}
                  />
                </button>
              ))}
            </div>
            <Textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder={t("placeholder")}
              rows={3}
              maxLength={2000}
              disabled={busy}
            />
            <div className="flex items-center gap-2">
              <Button type="button" onClick={submit} disabled={busy}>
                {hasReview ? t("update") : t("submit")}
              </Button>
              {hasReview ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={remove}
                  disabled={busy}
                >
                  {t("delete")}
                </Button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">{t("signInPrompt")}</p>
        )}
      </div>

      {/* The list. */}
      {reviews.length === 0 ? (
        <p className="text-muted-foreground mt-4 text-sm">{t("empty")}</p>
      ) : (
        <ul className="mt-4 divide-y">
          {reviews.map((review) => (
            <li key={review.id} className="py-4">
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={review.reviewer.name ?? "?"}
                  src={review.reviewer.avatar}
                  className="size-9"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {review.reviewer.name}
                    </span>
                    <StarRating value={review.rating} size={14} />
                  </div>
                  {review.body ? (
                    <p className="mt-1.5 text-sm text-pretty">{review.body}</p>
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
                  {user ? (
                    <button
                      type="button"
                      onClick={() => report(review.id)}
                      className="text-muted-foreground hover:text-foreground mt-2 text-xs underline underline-offset-2"
                    >
                      {t("report")}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {page < lastPage ? (
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
      ) : null}
    </section>
  );
}
