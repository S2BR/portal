"use client";

import { Flag, MessageSquare } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/auth/user-avatar";
import { StarRating } from "@/components/business/public/star-rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

import type {
  OwnerReview,
  OwnerReviewsPage,
} from "@/app/api/businesses/[slug]/owner-reviews/route";

/**
 * The owner's reviews surface: every review on their business (hidden ones flagged), newest first,
 * with report counts and a single public reply per review the owner can post, edit, or remove.
 * Optimistic — replies update the row in place; "show more" appends further pages.
 */
export function OwnerReviews({ slug }: { slug: string }) {
  const t = useTranslations("businesses.workspace.reviews");
  const format = useFormatter();

  const [reviews, setReviews] = useState<OwnerReview[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/businesses/${encodeURIComponent(slug)}/owner-reviews`,
        );
        const data = (await response.json()) as OwnerReviewsPage;
        if (active) {
          setReviews(data.data);
          setPage(data.meta.current_page);
          setLastPage(data.meta.last_page);
        }
      } catch {
        // Stay quiet — an empty list reads the same as "no reviews yet".
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/owner-reviews?page=${next}`,
      );
      const data = (await response.json()) as OwnerReviewsPage;
      setReviews((current) => [...current, ...data.data]);
      setPage(data.meta.current_page);
      setLastPage(data.meta.last_page);
    } catch {
      toast.error(t("error"));
    } finally {
      setLoadingMore(false);
    }
  }

  function patch(id: string, changes: Partial<OwnerReview>) {
    setReviews((current) =>
      current.map((review) =>
        review.id === id ? { ...review, ...changes } : review,
      ),
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <ReviewRow
              key={review.id}
              slug={slug}
              review={review}
              onChange={patch}
              t={t}
              formatDate={(value) =>
                value
                  ? format.dateTime(new Date(value), {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : ""
              }
            />
          ))}
        </ul>
      )}

      {page < lastPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={loadMore}
          disabled={loadingMore}
        >
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}

/** One review row: reviewer, rating, body, moderation flags, and the owner's reply editor. */
function ReviewRow({
  slug,
  review,
  onChange,
  t,
  formatDate,
}: {
  slug: string;
  review: OwnerReview;
  onChange: (id: string, changes: Partial<OwnerReview>) => void;
  t: ReturnType<typeof useTranslations<"businesses.workspace.reviews">>;
  formatDate: (value: string | null) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.owner_reply ?? "");
  const [busy, setBusy] = useState(false);

  // Optimistic: apply the reply to the list + close the editor at once, then persist in the
  // background; on failure roll the reply back, re-open with the draft intact, and show the error.
  async function save() {
    if (busy || draft.trim().length === 0) {
      return;
    }
    const previousReply = review.owner_reply;
    const previousRepliedAt = review.owner_replied_at;
    const body = draft.trim();

    setBusy(true);
    onChange(review.id, {
      owner_reply: body,
      owner_replied_at: new Date().toISOString(),
    });
    setEditing(false);
    toast.success(t("saved"));

    let ok = false;
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(review.id)}/reply`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      ok = response.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      onChange(review.id, {
        owner_reply: previousReply,
        owner_replied_at: previousRepliedAt,
      });
      setEditing(true);
      toast.error(t("error"));
    }
    setBusy(false);
  }

  async function remove() {
    if (busy) {
      return;
    }
    const previousReply = review.owner_reply;
    const previousRepliedAt = review.owner_replied_at;

    setBusy(true);
    onChange(review.id, { owner_reply: null, owner_replied_at: null });
    setDraft("");
    setEditing(false);
    toast.success(t("removed"));

    let ok = false;
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/reviews/${encodeURIComponent(review.id)}/reply`,
        { method: "DELETE" },
      );
      ok = response.ok;
    } catch {
      ok = false;
    }
    if (!ok) {
      onChange(review.id, {
        owner_reply: previousReply,
        owner_replied_at: previousRepliedAt,
      });
      setDraft(previousReply ?? "");
      setEditing(true);
      toast.error(t("error"));
    }
    setBusy(false);
  }

  return (
    <li className="bg-card rounded-2xl border p-5">
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
            <span className="text-muted-foreground text-xs">
              {formatDate(review.created_at)}
            </span>
            {review.is_hidden ? (
              <Badge variant="neutral" className="text-[10px] uppercase">
                {t("hidden")}
              </Badge>
            ) : null}
            {review.report_count > 0 ? (
              <span className="text-destructive inline-flex items-center gap-1 text-xs font-medium">
                <Flag className="size-3" aria-hidden />
                {t("reports", { count: review.report_count })}
              </span>
            ) : null}
          </div>
          {review.body ? (
            <p className="mt-1.5 text-sm text-pretty">{review.body}</p>
          ) : null}

          {/* The owner's public reply — shown, edited, or added below the review. */}
          {review.owner_reply && !editing ? (
            <div className="bg-muted/50 mt-3 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {t("yourReply")}
              </p>
              <p className="mt-1 text-sm text-pretty">{review.owner_reply}</p>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(true)}
                  disabled={busy}
                >
                  {t("editReply")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={remove}
                  disabled={busy}
                >
                  {t("removeReply")}
                </Button>
              </div>
            </div>
          ) : editing ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={t("replyPlaceholder")}
                rows={3}
                maxLength={2000}
                disabled={busy}
              />
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={save} disabled={busy}>
                  {t("save")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setDraft(review.owner_reply ?? "");
                  }}
                  disabled={busy}
                >
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setEditing(true)}
            >
              <MessageSquare className="size-4" aria-hidden />
              {t("reply")}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
