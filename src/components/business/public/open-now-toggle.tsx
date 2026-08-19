"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useToggleRefinement } from "react-instantsearch";

import { cn } from "@/lib/utils";

/**
 * The current absolute UTC 15-minute epoch slot — the value the "open now" filter matches against a
 * business's indexed `open_slots` (a rolling window of concrete dates). Mirrors the API's
 * `OpenNow::currentSlot`: floor(unix seconds / 900).
 */
function currentOpenSlot(): number {
  return Math.floor(Date.now() / 1000 / 900);
}

/**
 * "Open now" directory filter — a toggle bound to the `open_slots` Typesense facet. When on, it keeps
 * only businesses whose indexed open slots include the current UTC slot. The slot is fixed per mount
 * (a directory session is short); a session crossing a 15-minute boundary is at most that stale.
 */
export function OpenNowToggle() {
  const t = useTranslations("businesses.directory");
  const slot = useMemo(() => currentOpenSlot(), []);
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
