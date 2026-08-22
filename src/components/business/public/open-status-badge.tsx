"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  computeOpenState,
  formatBoundaryDay,
  formatBoundaryTime,
  isDifferentDay,
  type OpenStatus,
} from "@/lib/business-hours";
import { cn } from "@/lib/utils";

/** Per-status dot + text colors — green when open, amber near a boundary, muted when closed. */
const TONE: Record<OpenStatus, { dot: string; text: string }> = {
  open: {
    dot: "bg-brand-green",
    text: "text-brand-green-deep dark:text-brand-green",
  },
  closing_soon: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-500",
  },
  opening_soon: {
    dot: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-500",
  },
  closed: { dot: "bg-muted-foreground/60", text: "text-muted-foreground" },
};

/**
 * A live "Open · Closes 6:00 PM" / "Closed · Opens 9:00 AM Mon" status, Google-style, computed on the
 * client from the business's `open_slots` (absolute UTC epoch slots) and its IANA zone. Re-evaluates
 * every minute. Renders nothing until mounted (avoids an SSR/now mismatch) or when there are no hours.
 */
export function OpenStatusBadge({
  slots,
  timezone,
}: {
  slots: number[];
  timezone: string | null;
}) {
  const t = useTranslations("businesses.public");
  const locale = useLocale();
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    // First value after mount (client-only, so no SSR/now hydration mismatch), then tick each minute.
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, []);

  if (now === null || slots.length === 0) {
    return null;
  }

  const { status, changeAt } = computeOpenState(slots, now);
  const zone = timezone ?? undefined;

  const label: Record<OpenStatus, string> = {
    open: t("statusOpen"),
    closing_soon: t("statusClosingSoon"),
    opening_soon: t("statusOpeningSoon"),
    closed: t("statusClosed"),
  };

  let detail: string | null = null;
  if (changeAt !== null) {
    const time = formatBoundaryTime(changeAt, locale, zone);
    if (status === "open" || status === "closing_soon") {
      detail = t("closesAt", { time });
    } else if (isDifferentDay(changeAt, now, zone)) {
      detail = t("opensAtDay", {
        time,
        day: formatBoundaryDay(changeAt, locale, zone),
      });
    } else {
      detail = t("opensAt", { time });
    }
  }

  const tone = TONE[status];

  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      <span
        className={cn("size-2 shrink-0 rounded-full", tone.dot)}
        aria-hidden
      />
      <span className={tone.text}>{label[status]}</span>
      {detail ? (
        <span className="text-muted-foreground font-normal">{detail}</span>
      ) : null}
    </span>
  );
}
