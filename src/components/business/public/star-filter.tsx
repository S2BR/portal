"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNumericMenu } from "react-instantsearch";

import {
  STAR_LEVELS,
  toStarRows,
} from "@/components/business/public/star-filter-rows";
import { cn } from "@/lib/utils";

/**
 * The directory's rating filter — "★★★★ & up" rows bound to the `rating_avg` numeric field via
 * `useNumericMenu` (each row applies `rating_avg >= N`). Single-select: picking a level replaces the
 * previous one, and clicking the active level clears it. Unrated businesses (avg 0) match no level, so
 * this naturally narrows to rated businesses only. Styled to match `FacetList`.
 */
export function StarFilter() {
  const t = useTranslations("businesses.directory");
  const { items, refine } = useNumericMenu({
    attribute: "rating_avg",
    items: [
      { label: "all" },
      ...STAR_LEVELS.map((stars) => ({ label: String(stars), start: stars })),
    ],
  });

  const { rows, clearValue } = toStarRows(items);
  const hasActive = rows.some((row) => row.isRefined);

  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {t("facetRating")}
        </h3>
        {hasActive && clearValue ? (
          <button
            type="button"
            onClick={() => refine(clearValue)}
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-0.5">
        {rows.map((row) => (
          <li key={row.stars}>
            <button
              type="button"
              onClick={() =>
                refine(row.isRefined && clearValue ? clearValue : row.value)
              }
              aria-pressed={row.isRefined}
              aria-label={t("ratingAriaLabel", { stars: row.stars })}
              className={cn(
                "hover:bg-muted/60 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                row.isRefined && "bg-muted/60 font-medium",
              )}
            >
              <span className="flex" aria-hidden>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className={cn(
                      "size-3.5",
                      index < row.stars
                        ? "fill-brand-gold text-brand-gold"
                        : "text-muted-foreground/30",
                    )}
                  />
                ))}
              </span>
              <span className="text-muted-foreground text-xs">
                {t("ratingAndUp")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
