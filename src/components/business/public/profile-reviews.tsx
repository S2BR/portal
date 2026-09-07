import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { UserAvatar } from "@/components/auth/user-avatar";
import { StarRating } from "@/components/business/public/star-rating";
import { Button } from "@/components/ui/button";
import type { PublicReviewsPage } from "@/lib/public-business";

const STARS = [5, 4, 3, 2, 1];
const PREVIEW = 3;

/**
 * A compact reviews block for the business profile: the rating average + a 5→1 histogram, the few most
 * recent reviews, and links to write one / see them all (the full experience lives on the reviews
 * page). Server-rendered from the same public reviews the reviews page uses.
 */
export async function ProfileReviews({
  slug,
  reviews,
  locale,
}: {
  slug: string;
  reviews: PublicReviewsPage;
  locale: string;
}) {
  const t = await getTranslations("businesses.public.reviews");
  const summary = reviews.rating;
  const reviewsHref = `/businesses/${slug}/reviews`;
  const preview = reviews.data.slice(0, PREVIEW);
  const dateFormat = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const maxBar = summary
    ? Math.max(1, ...STARS.map((star) => summary.breakdown[String(star)] ?? 0))
    : 1;

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
          {t("title")}
        </h2>
        {summary && summary.count > 0 ? (
          <Link
            href={reviewsHref}
            className="text-primary text-xs font-medium hover:underline"
          >
            {t("seeAll")}
          </Link>
        ) : null}
      </div>

      {!summary || summary.count === 0 ? (
        <div className="bg-muted/40 mt-3 flex flex-col items-start gap-3 rounded-2xl p-5">
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
          <Button asChild size="sm">
            <Link href={reviewsHref}>{t("leaveReview")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid gap-6 sm:grid-cols-[13rem_1fr] sm:items-start">
          <div className="bg-card flex flex-col items-center rounded-2xl border p-5">
            <span className="text-4xl font-semibold tabular-nums">
              {summary.avg.toFixed(1)}
            </span>
            <StarRating value={summary.avg} size={18} className="mt-1.5" />
            <span className="text-muted-foreground mt-1 text-xs">
              {t("count", { count: summary.count })}
            </span>
            <div className="mt-4 w-full space-y-1.5">
              {STARS.map((star) => {
                const count = summary.breakdown[String(star)] ?? 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-3 text-right tabular-nums">
                      {star}
                    </span>
                    <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
                      <span
                        className="bg-brand-gold block h-full rounded-full"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </span>
                    <span className="text-muted-foreground w-6 text-right tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button asChild variant="outline" size="sm" className="mt-4 w-full">
              <Link href={reviewsHref}>{t("leaveReview")}</Link>
            </Button>
          </div>

          <ul className="divide-border/60 divide-y">
            {preview.map((review) => (
              <li key={review.id} className="py-3 first:pt-0">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    name={review.reviewer.name ?? "?"}
                    src={review.reviewer.avatar}
                    className="size-8"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {review.reviewer.name}
                      </span>
                      <StarRating value={review.rating} size={13} />
                      {review.created_at ? (
                        <span className="text-muted-foreground text-xs">
                          {dateFormat.format(new Date(review.created_at))}
                        </span>
                      ) : null}
                    </div>
                    {review.body ? (
                      <p className="mt-1 line-clamp-3 text-sm text-pretty">
                        {review.body}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
