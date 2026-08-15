"use client";

import { useTranslations } from "next-intl";
import { useClearRefinements, useRefinementList } from "react-instantsearch";

import { Checkbox } from "@/components/ui/checkbox";

/**
 * One faceted filter in the directory sidebar — a checkbox refinement list bound to a Typesense facet.
 * Only values present in the current results show (so the user is never offered a filter that returns
 * nothing), and the counts live-update as other facets change. Slugs are mapped to localized labels
 * via `labels`. Styled to match the business editor's amenity picker.
 */
export function FacetList({
  attribute,
  title,
  labels,
  limit = 6,
}: {
  attribute: string;
  title: string;
  /** Map a facet value (slug / enum) to its display label; falls back to the raw value. */
  labels?: Record<string, string>;
  limit?: number;
}) {
  const t = useTranslations("businesses.directory");
  const { items, refine, canToggleShowMore, isShowingMore, toggleShowMore } =
    useRefinementList({
      attribute,
      limit,
      showMore: true,
      showMoreLimit: 50,
      sortBy: ["count:desc", "name:asc"],
    });
  const { canRefine: canClear, refine: clearFacet } = useClearRefinements({
    includedAttributes: [attribute],
  });

  // Hide the whole facet when it has no values in the current result set.
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 px-2">
        <h3 className="text-muted-foreground text-xs font-medium tracking-wider uppercase">
          {title}
        </h3>
        {canClear ? (
          <button
            type="button"
            onClick={clearFacet}
            className="text-muted-foreground hover:text-foreground text-xs font-medium"
          >
            {t("clearFilters")}
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-0.5">
        {items.map((item) => (
          <li key={item.label}>
            <label className="hover:bg-muted/60 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm">
              <Checkbox
                checked={item.isRefined}
                onCheckedChange={() => refine(item.value)}
              />
              <span className="min-w-0 flex-1 truncate">
                {labels?.[item.label] ?? item.label}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {item.count}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {canToggleShowMore ? (
        <button
          type="button"
          onClick={toggleShowMore}
          className="text-muted-foreground hover:text-foreground mt-1 px-2 py-1 text-xs font-medium"
        >
          {isShowingMore ? t("showLess") : t("showMore")}
        </button>
      ) : null}
    </div>
  );
}
