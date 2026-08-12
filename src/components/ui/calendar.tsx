"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  addDays,
  fullDateLabel,
  monthGrid,
  monthOf,
  monthTitle,
  shiftMonth,
  weekdayLabels,
  type YearMonth,
} from "@/lib/calendar";
import { toISO } from "@/lib/date-wheel";
import { cn } from "@/lib/utils";

/**
 * A reusable month-grid calendar with full keyboard support. Owns its visible month and a roving
 * tab target (only one day is tab-reachable; arrow keys move it and cross months as needed). The tab
 * target always stays inside the visible month, so paging with the arrows or the header buttons never
 * strands focus. Presentational only — the parent decides what a "pick" means via `onPick` and shades
 * days through the `isClosed`/`isPreview` predicates. No external date dependency.
 */
export function Calendar({
  locale,
  today,
  viewDate,
  minDate,
  isMarked,
  isSelected,
  isPreview,
  onPick,
  onHover,
  labels,
  className,
}: {
  locale: string;
  today: string;
  /** The calendar jumps to this date's month whenever it changes (e.g. selecting another entry);
   *  defaults to today's month. */
  viewDate?: string | null;
  /** Earliest selectable date (inclusive); earlier days are disabled. */
  minDate?: string;
  /** Days that carry an entry but aren't the active one — shown with a small dot. */
  isMarked?: (iso: string) => boolean;
  /** Days of the entry currently open in the panel — shaded. */
  isSelected?: (iso: string) => boolean;
  /** Days in the live range being picked — shaded like selected. */
  isPreview?: (iso: string) => boolean;
  onPick: (iso: string) => void;
  onHover?: (iso: string | null) => void;
  labels: { previousMonth: string; nextMonth: string };
  className?: string;
}) {
  const [month, setMonth] = useState<YearMonth>(() =>
    monthOf(viewDate ?? today),
  );
  const [focused, setFocused] = useState<string>(viewDate ?? today);

  // Jump to the requested date's month when it changes (e.g. clicking another entry to edit it).
  // Adjusting state during render — React's recommended pattern over an effect, and it avoids the
  // extra paint a setState-in-effect would cost.
  const [seenViewDate, setSeenViewDate] = useState(viewDate);
  if (viewDate && viewDate !== seenViewDate) {
    setSeenViewDate(viewDate);
    setMonth(monthOf(viewDate));
  }

  const gridRef = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const titleId = useId();

  // The tab-reachable day: the roving focus when it's in view, else the 1st of the visible month —
  // so paging months always leaves exactly one focusable day.
  const firstIso = toISO({ year: month.year, month: month.month, day: 1 });
  const tabTarget =
    focused.slice(0, 7) === firstIso.slice(0, 7) ? focused : firstIso;

  // After a keyboard move (which may change the visible month), focus the target day's button.
  useEffect(() => {
    if (!shouldFocus.current) {
      return;
    }
    shouldFocus.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-iso="${focused}"]`)
      ?.focus();
  }, [focused, month]);

  const moveFocus = (next: string) => {
    if (minDate && next < minDate) {
      return;
    }
    shouldFocus.current = true;
    setFocused(next);
    setMonth(monthOf(next));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      PageUp: -28,
      PageDown: 28,
    };
    const delta = step[event.key];
    if (delta !== undefined) {
      event.preventDefault();
      moveFocus(addDays(tabTarget, delta));
    } else if (event.key === "Home") {
      event.preventDefault();
      moveFocus(addDays(tabTarget, -Number(new Date(tabTarget).getUTCDay())));
    } else if (event.key === "End") {
      event.preventDefault();
      moveFocus(
        addDays(tabTarget, 6 - Number(new Date(tabTarget).getUTCDay())),
      );
    }
  };

  const weekdays = weekdayLabels(locale);

  return (
    <div className={cn("select-none", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setMonth((current) => shiftMonth(current, -1))}
          aria-label={labels.previousMonth}
          className="hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronLeft className="size-4" />
        </button>
        <div
          id={titleId}
          aria-live="polite"
          className="text-sm font-medium capitalize"
        >
          {monthTitle(locale, month)}
        </div>
        <button
          type="button"
          onClick={() => setMonth((current) => shiftMonth(current, 1))}
          aria-label={labels.nextMonth}
          className="hover:bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring flex size-8 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-labelledby={titleId}
        onKeyDown={onKeyDown}
        onMouseLeave={() => onHover?.(null)}
      >
        <div role="row" className="grid grid-cols-7">
          {weekdays.map((label, index) => (
            <div
              key={index}
              role="columnheader"
              className="text-muted-foreground pb-1 text-center text-xs font-medium"
            >
              {label}
            </div>
          ))}
        </div>
        {monthGrid(month).map((week, weekIndex) => (
          <div key={weekIndex} role="row" className="grid grid-cols-7 gap-1">
            {week.map((iso, dayIndex) => {
              if (!iso) {
                return <div key={dayIndex} role="gridcell" />;
              }
              const disabled = minDate ? iso < minDate : false;
              const marked = isMarked?.(iso) ?? false;
              const selected = isSelected?.(iso) ?? false;
              const preview = isPreview?.(iso) ?? false;
              const active = selected || preview;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  role="gridcell"
                  data-iso={iso}
                  disabled={disabled}
                  aria-label={fullDateLabel(locale, iso)}
                  aria-selected={selected || marked}
                  aria-current={isToday ? "date" : undefined}
                  tabIndex={iso === tabTarget ? 0 : -1}
                  onClick={() => {
                    setFocused(iso);
                    onPick(iso);
                  }}
                  onFocus={() => setFocused(iso)}
                  onMouseEnter={() => onHover?.(iso)}
                  className={cn(
                    "focus-visible:ring-ring relative flex h-9 items-center justify-center rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                    disabled
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : active
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/15 font-medium"
                        : "hover:bg-muted text-foreground",
                    isToday && !active && !disabled && "ring-border ring-1",
                  )}
                >
                  {Number(iso.slice(8))}
                  {marked && !active ? (
                    <span
                      className="bg-destructive absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
