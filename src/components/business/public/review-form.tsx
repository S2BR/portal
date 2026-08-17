"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * The write / edit / delete-your-review block — a star input and an optional body. Signed-in only
 * (otherwise a sign-in prompt); prefills from the user's existing review. On any successful change
 * it calls `onSaved` so the parent can refresh the list and the rating summary.
 */
export function ReviewForm({
  slug,
  onSaved,
}: {
  slug: string;
  onSaved?: () => void;
}) {
  const t = useTranslations("businesses.public.reviews");
  const { user } = useCurrentUser();

  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState("");
  const [hasReview, setHasReview] = useState(false);
  const [busy, setBusy] = useState(false);

  // Prefill the form from the signed-in user's existing review.
  useEffect(() => {
    if (!user) {
      return;
    }
    let active = true;
    void fetch(`/api/businesses/${encodeURIComponent(slug)}/review`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: { review?: { rating: number; body: string | null } } | null) => {
          if (active && data?.review) {
            setRating(data.review.rating);
            setBody(data.review.body ?? "");
            setHasReview(true);
          }
        },
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [user, slug]);

  async function submit() {
    if (rating < 1) {
      toast.error(t("ratingRequired"));
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/review`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating, body: body.trim() || null }),
        },
      );
      const data = (await response.json()) as {
        status?: string;
        message?: string;
      };
      if (data.status === "ok") {
        setHasReview(true);
        toast.success(t("saved"));
        onSaved?.();
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
      const response = await fetch(
        `/api/businesses/${encodeURIComponent(slug)}/review`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setHasReview(false);
        setRating(0);
        setBody("");
        toast.success(t("removed"));
        onSaved?.();
      } else {
        toast.error(t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setBusy(false);
    }
  }

  if (!user) {
    return (
      <div className="bg-muted/40 rounded-2xl border p-5">
        <p className="text-muted-foreground text-sm">{t("signInPrompt")}</p>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 space-y-3 rounded-2xl border p-5">
      <p className="text-sm font-medium">
        {hasReview ? t("yourReview") : t("writeTitle")}
      </p>
      <div className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
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
          <Button type="button" variant="ghost" onClick={remove} disabled={busy}>
            {t("delete")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
