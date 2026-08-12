"use client";

import { Plus, X } from "lucide-react";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** One open–close range, both `HH:MM`. */
export type HourSlot = { open: string; close: string };

/** Every half hour of the day, "HH:MM" (48 options) — a 30-minute step. */
const TIME_OPTIONS: string[] = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2);
  const minute = index % 2 === 0 ? "00" : "30";
  return `${String(hour).padStart(2, "0")}:${minute}`;
});

export const DEFAULT_SLOT: HourSlot = { open: "09:00", close: "17:00" };

/** "HH:MM" → the viewer's localized time label (e.g. "9:00 AM" or "09:00"). */
export function formatTime(value: string, locale: string): string {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2000, 0, 1, hour ?? 0, minute ?? 0));
}

/** One hour after "HH:MM", wrapping at midnight — the default end for a freshly added range. */
export function oneHourLater(value: string): string {
  const [hour, minute] = value.split(":").map(Number);
  const next = ((hour ?? 0) + 1) % 24;
  return `${String(next).padStart(2, "0")}:${String(minute ?? 0).padStart(2, "0")}`;
}

/** A single time dropdown (half-hour steps), labels localized. */
export function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const locale = useLocale();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {TIME_OPTIONS.map((option) => (
          <SelectItem key={option} value={option}>
            {formatTime(option, locale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * An editable list of open–close time ranges (split shifts): each row is two time dropdowns with a
 * remove button, plus an "add range" button that appends a range starting where the last one ends.
 * The parent decides what an empty list means. Reused by the per-date special hours.
 */
export function TimeRanges({
  value,
  onChange,
  labels,
}: {
  value: HourSlot[];
  onChange: (slots: HourSlot[]) => void;
  labels: { open: string; close: string; addRange: string; removeRange: string };
}) {
  const update = (index: number, patch: Partial<HourSlot>) =>
    onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));
  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));
  const add = () => {
    const last = value[value.length - 1];
    const open = last?.close ?? DEFAULT_SLOT.open;
    onChange([...value, { open, close: oneHourLater(open) }]);
  };

  return (
    <div className="space-y-2">
      {value.map((slot, index) => (
        <div key={index} className="flex items-center gap-2">
          <TimeSelect
            value={slot.open}
            onChange={(open) => update(index, { open })}
            label={labels.open}
          />
          <span className="text-muted-foreground">–</span>
          <TimeSelect
            value={slot.close}
            onChange={(close) => update(index, { close })}
            label={labels.close}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            aria-label={labels.removeRange}
            onClick={() => remove(index)}
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="size-4" />
        {labels.addRange}
      </Button>
    </div>
  );
}
