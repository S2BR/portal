"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToggleRefinement } from "react-instantsearch";

import { cn } from "@/lib/utils";

/**
 * "Open now" directory filter — a toggle bound to the `open_slots` Typesense facet. When on, it keeps
 * only businesses whose indexed open slots include `slot` (the current absolute UTC 15-minute slot,
 * `OpenNow::currentSlot`). The parent advances `slot` over time, so InstantSearch re-derives the
 * filter and re-runs the search on the new slot — a business that just closed drops out on its own,
 * rather than lingering on a slot frozen at mount until a full reload.
 */
export function OpenNowToggle({ slot }: { slot: number }) {
  const t = useTranslations("businesses.directory");
  const { value, refine } = useToggleRefinement({
    attribute: "open_slots",
    on: slot,
  });

  return (
    <button
      type="button"
      onClick={() => refine(value)}
      aria-pressed={value.isRefined}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
        value.isRefined
          ? "border-brand-green/40 bg-brand-green/10 text-brand-green-deep dark:text-brand-green"
          : "border-border hover:bg-muted/60 text-foreground",
      )}
    >
      <Clock className="size-4 shrink-0" aria-hidden />
      {t("openNow")}
    </button>
  );
}
