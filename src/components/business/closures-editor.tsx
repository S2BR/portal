"use client";

import { CalendarPlus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { BusinessClosure } from "@/app/api/businesses/route";
import { closureHasInvalidWindow, closureIsPast } from "@/lib/closure-time";
import {
  formatTime,
  TimeRanges,
  DEFAULT_SLOT,
  type HourSlot,
} from "@/components/business/time-ranges";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  dateInClosure,
  formatClosureDate,
  overlappingClosure,
  todayISO,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

/** A closed/special date as edited in the form. `key` is a stable client id; a single day has
 *  startDate == endDate; `hours` empty ⇒ closed all day, otherwise open those ranges. */
export type ClosureEntry = {
  key: string;
  /** Server public code (present for existing rows, absent for new ones). */
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  hours: HourSlot[];
};

const inRange = (iso: string, a: string, b: string) =>
  a !== "" && iso >= (a < b ? a : b) && iso <= (a < b ? b : a);

/** "9:00 – 13:00, 14:00 – 18:00" for a set of ranges. */
function hoursSummary(hours: HourSlot[], locale: string): string {
  return hours
    .map(
      (slot) =>
        `${formatTime(slot.open, locale)}–${formatTime(slot.close, locale)}`,
    )
    .join(", ");
}

/** Single dates first (by full date), then recurring (by month+day) — chronological, never creation order. */
function sortEntries<
  T extends {
    start_date?: string;
    startDate?: string;
    is_recurring?: boolean;
    isRecurring?: boolean;
  },
>(entries: T[]) {
  const start = (e: T) => e.start_date ?? e.startDate ?? "";
  return [...entries]
    .sort((a, b) => start(a).slice(5).localeCompare(start(b).slice(5)))
    .sort((a, b) => start(a).localeCompare(start(b)));
}

/**
 * Picks a business's holidays and special hours: pick date(s) on the calendar, then fill a detail
 * panel beside it (name, repeats-yearly, and either "closed" or custom open hours). Entries are
 * listed below in two groups — Single and Recurring — each in date order; clicking one loads it back
 * into the panel to edit. Reusable wherever an entity needs blackout / special dates.
 */
export function ClosuresEditor({
  value,
  onChange,
  timezone,
}: {
  value: ClosureEntry[];
  onChange: (value: ClosureEntry[]) => void;
  /** The business timezone, so a past special date is judged in the business's own day. */
  timezone?: string;
}) {
  const t = useTranslations("businesses.detail");
  const fields = useTranslations("businesses.detail.fields");
  const create = useTranslations("businessNew");
  const locale = useLocale();
  const today = todayISO();
  const blockRef = useRef<HTMLDivElement>(null);

  const [draft, setDraft] = useState<ClosureEntry | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const blank = (): ClosureEntry => ({
    key: crypto.randomUUID(),
    name: "",
    startDate: "",
    endDate: "",
    isRecurring: false,
    hours: [],
  });

  const startNew = () => {
    // Seed with today (the earliest selectable day) so the panel shows the editable form right away
    // — otherwise "Add date" would just swap itself for a hint and read as a no-op. Click any day to
    // move it, or click a second day to make it a range.
    setDraft({ ...blank(), startDate: today, endDate: today });
    setEditingKey(null);
    setPendingStart(null);
    blockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startEdit = (entry: ClosureEntry) => {
    setDraft({ ...entry, hours: entry.hours.map((slot) => ({ ...slot })) });
    setEditingKey(entry.key);
    setPendingStart(null);
    blockRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancel = () => {
    setDraft(null);
    setEditingKey(null);
    setPendingStart(null);
    setHover(null);
  };

  const save = () => {
    if (!draft || draft.startDate === "") {
      return;
    }
    // Reject a past special date here (in the business timezone), so it never reaches the save with a
    // window already over — a still-open window today, overnight, or closed-all-day today is fine.
    if (closureIsPast(draft, timezone)) {
      toast.error(create("errorClosurePast"));
      return;
    }
    if (closureHasInvalidWindow(draft)) {
      toast.error(create("errorClosureHours"));
      return;
    }
    // Never let a draft land on a date another closure already covers — that's how a duplicate on the
    // same day slips in. Clicking an occupied day opens that closure to edit instead (see `pick`), so
    // this is the backstop for the "Add date" path.
    if (overlappingClosure(draft, value, editingKey)) {
      toast.error(t("closureOverlap"));
      return;
    }
    onChange(
      editingKey
        ? value.map((c) => (c.key === editingKey ? draft : c))
        : [...value, draft],
    );
    cancel();
  };

  const remove = () => {
    if (editingKey) {
      onChange(value.filter((c) => c.key !== editingKey));
    }
    cancel();
  };

  const pick = (iso: string) => {
    if (iso < today) {
      return;
    }
    // Clicking a day that already belongs to another closure opens THAT one to edit — so you edit the
    // existing date instead of silently starting a second closure on top of it.
    if (pendingStart === null) {
      const existing = value.find(
        (c) => c.key !== editingKey && dateInClosure(iso, c),
      );
      if (existing) {
        startEdit(existing);
        return;
      }
    }
    const base = draft ?? blank();
    if (pendingStart === null) {
      setDraft({ ...base, startDate: iso, endDate: iso });
      setPendingStart(iso);
      if (!draft) {
        setEditingKey(null);
      }
    } else {
      const start = iso < pendingStart ? iso : pendingStart;
      const end = iso < pendingStart ? pendingStart : iso;
      setDraft({ ...base, startDate: start, endDate: end });
      setPendingStart(null);
      setHover(null);
    }
  };

  const isMarked = (iso: string) =>
    value.some((c) => c.key !== editingKey && dateInClosure(iso, c));
  const isSelected = (iso: string) =>
    draft ? inRange(iso, draft.startDate, draft.endDate) : false;
  const isPreview = (iso: string) =>
    pendingStart && hover ? inRange(iso, pendingStart, hover) : false;

  const single = sortEntries(value.filter((c) => !c.isRecurring));
  const recurring = sortEntries(value.filter((c) => c.isRecurring));

  const draftHasHours = (draft?.hours.length ?? 0) > 0;

  const listItem = (entry: ClosureEntry) => (
    <li key={entry.key}>
      <button
        type="button"
        onClick={() => startEdit(entry)}
        className={cn(
          "hover:bg-muted/60 focus-visible:ring-ring flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none",
          editingKey === entry.key && "bg-muted/60 ring-ring/40 ring-1",
        )}
      >
        <span
          className="bg-brand-green h-3.5 w-1 shrink-0 rounded-full"
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          {entry.name ? (
            <span className="text-sm font-medium">{entry.name} · </span>
          ) : null}
          <span className="text-muted-foreground text-sm">
            {formatClosureDate(
              locale,
              entry.startDate,
              entry.endDate,
              entry.isRecurring,
            )}
          </span>
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {entry.hours.length > 0
            ? hoursSummary(entry.hours, locale)
            : t("closedAllDay")}
        </span>
      </button>
    </li>
  );

  return (
    <div className="space-y-5">
      <div
        ref={blockRef}
        className="grid scroll-mt-24 gap-5 md:grid-cols-[auto_1fr]"
      >
        <Calendar
          locale={locale}
          today={today}
          minDate={today}
          viewDate={draft?.startDate || undefined}
          isMarked={isMarked}
          isSelected={isSelected}
          isPreview={isPreview}
          onPick={pick}
          onHover={setHover}
          labels={{
            previousMonth: t("previousMonth"),
            nextMonth: t("nextMonth"),
          }}
          className="bg-muted/40 w-80 max-w-full shrink-0 rounded-xl p-3"
        />

        <div className="min-w-0">
          {draft === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-muted-foreground text-sm text-pretty">
                {t("closuresHint")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={startNew}
              >
                <CalendarPlus className="size-4" />
                {t("addClosedDate")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-base font-semibold">
                {formatClosureDate(
                  locale,
                  draft.startDate,
                  draft.endDate,
                  draft.isRecurring,
                )}
              </p>

              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
                placeholder={t("closureNamePlaceholder")}
                aria-label={t("closureName")}
              />

              <label className="flex items-center justify-between gap-3 text-sm">
                {t("repeatsYearly")}
                <Switch
                  checked={draft.isRecurring}
                  onCheckedChange={(checked) =>
                    setDraft({ ...draft, isRecurring: checked })
                  }
                />
              </label>

              <label className="flex items-center justify-between gap-3 text-sm">
                {t("specialHours")}
                <Switch
                  checked={draftHasHours}
                  onCheckedChange={(checked) =>
                    setDraft({
                      ...draft,
                      hours: checked ? [{ ...DEFAULT_SLOT }] : [],
                    })
                  }
                />
              </label>

              {draftHasHours ? (
                <TimeRanges
                  value={draft.hours}
                  onChange={(hours) => setDraft({ ...draft, hours })}
                  labels={{
                    open: fields("open"),
                    close: fields("close"),
                    addRange: t("addTime"),
                    removeRange: t("removeTime"),
                  }}
                />
              ) : null}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button type="button" size="sm" onClick={save}>
                  {t("save")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={cancel}
                >
                  {t("cancelSelection")}
                </Button>
                {editingKey ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ms-auto"
                    onClick={remove}
                  >
                    {t("delete")}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>

      {single.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("closuresGroupSingle")}
          </p>
          <ul className="space-y-1">{single.map(listItem)}</ul>
        </div>
      ) : null}

      {recurring.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("closuresGroupRecurring")}
          </p>
          <ul className="space-y-1">{recurring.map(listItem)}</ul>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The read-only view of holidays & special hours: two groups (Single / Recurring), each in date
 * order; every entry shows the date(s) and either "Closed" or its custom hours.
 */
export function ClosuresReadout({ closures }: { closures: BusinessClosure[] }) {
  const t = useTranslations("businesses.detail");
  const locale = useLocale();
  const today = todayISO();
  const single = sortEntries(closures.filter((c) => !c.is_recurring));
  const recurring = sortEntries(closures.filter((c) => c.is_recurring));

  const row = (closure: BusinessClosure, index: number) => {
    // A one-off whose range has ended reads as history — dim it. Recurring ones repeat, never fade.
    const passed = !closure.is_recurring && closure.end_date < today;
    return (
      <li
        key={index}
        className={cn("flex items-center gap-3", passed && "opacity-50")}
      >
        <span
          className="bg-brand-green h-3.5 w-1 shrink-0 rounded-full"
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm">
          {closure.name ? (
            <span className="font-medium">{closure.name} · </span>
          ) : null}
          <span className="text-muted-foreground">
            {formatClosureDate(
              locale,
              closure.start_date,
              closure.end_date,
              closure.is_recurring,
            )}
          </span>
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          {closure.hours && closure.hours.length > 0
            ? hoursSummary(closure.hours, locale)
            : t("closedAllDay")}
        </span>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {single.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("closuresGroupSingle")}
          </p>
          <ul className="space-y-2.5">{single.map(row)}</ul>
        </div>
      ) : null}
      {recurring.length > 0 ? (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {t("closuresGroupRecurring")}
          </p>
          <ul className="space-y-2.5">{recurring.map(row)}</ul>
        </div>
      ) : null}
    </div>
  );
}
