"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  WheelPicker,
  type WheelPickerOption,
} from "@/components/ui/wheel-picker";
import {
  clampDay,
  daysInMonth,
  fieldOrder,
  fromISO,
  monthLabels,
  toISO,
  yearBounds,
  type DateField,
} from "@/lib/date-wheel";
import { cn } from "@/lib/utils";

/**
 * A date-of-birth picker: three beui {@link WheelPicker} drums (month / day / year) in the locale's
 * own field order, inside the same rounded, bordered container as beui's date demo. Months are
 * localized, the day count clamps to the chosen month/year, and years are capped so the account is at
 * least `minAge`. Emits `YYYY-MM-DD` whenever a wheel settles (a null `value` seeds a sensible default
 * but doesn't emit until the user moves a wheel).
 */
export function DateWheelPicker({
  value,
  onChange,
  locale,
  minAge = 13,
  labels,
  className,
}: {
  value: string | null;
  onChange: (iso: string) => void;
  locale: string;
  minAge?: number;
  labels: { year: string; month: string; day: string };
  className?: string;
}) {
  const currentYear = new Date().getFullYear();
  const { min, max } = yearBounds(minAge, currentYear);

  const [parts, setParts] = useState(
    () => fromISO(value ?? "") ?? { year: max - 12, month: 1, day: 1 },
  );

  // Re-seed if the external value changes (e.g. the edit form is reset).
  useEffect(() => {
    const parsed = fromISO(value ?? "");
    if (parsed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setParts(parsed);
    }
  }, [value]);

  const change = (next: Partial<typeof parts>) => {
    const merged = { ...parts, ...next };
    merged.day = clampDay(merged.day, merged.year, merged.month);
    setParts(merged);
    onChange(toISO(merged));
  };

  const monthOptions: WheelPickerOption[] = monthLabels(locale).map(
    (label, index) => ({ value: String(index + 1), label }),
  );
  const dayOptions = Array.from(
    { length: daysInMonth(parts.year, parts.month) },
    (_, index) => String(index + 1),
  );
  const yearOptions: string[] = [];
  for (let year = min; year <= max; year += 1) {
    yearOptions.push(String(year));
  }

  const wheels: Record<DateField, ReactNode> = {
    month: (
      <WheelPicker
        key="month"
        options={monthOptions}
        value={String(parts.month)}
        onValueChange={(next) => change({ month: Number(next) })}
        className="w-32 border-0 bg-transparent"
        visibleCount={7}
        itemHeight={42}
        sound
        aria-label={labels.month}
      />
    ),
    day: (
      <WheelPicker
        key="day"
        options={dayOptions}
        value={String(parts.day)}
        onValueChange={(next) => change({ day: Number(next) })}
        className="w-14 border-0 bg-transparent"
        visibleCount={7}
        itemHeight={42}
        sound
        aria-label={labels.day}
      />
    ),
    year: (
      <WheelPicker
        key="year"
        options={yearOptions}
        value={String(parts.year)}
        onValueChange={(next) => change({ year: Number(next) })}
        className="w-20 border-0 bg-transparent"
        visibleCount={7}
        itemHeight={42}
        sound
        aria-label={labels.year}
      />
    ),
  };

  return (
    <div
      className={cn(
        "bg-background flex items-stretch justify-center gap-1 rounded-3xl border p-2",
        className,
      )}
    >
      {fieldOrder(locale).map((field) => wheels[field])}
    </div>
  );
}
