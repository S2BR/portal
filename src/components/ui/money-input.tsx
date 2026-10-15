"use client";

import { Input } from "@/components/ui/input";

/** Integer cents → the field's display, decimal auto-placed (1250 → "12.50"), grouped. Empty for null. */
export function centsToInput(cents: number | null): string {
  if (cents === null) {
    return "";
  }
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** The field's text → integer cents, reading digits only (the last two are cents). Null when empty. */
export function inputToCents(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? null : Number.parseInt(digits, 10);
}

/**
 * A money field that formats as you type — digits fill from the right and the decimal separator is
 * placed automatically (type "350" → "3.50"), with thousands grouped, so there's no separator key to
 * hit. Holds and emits integer cents (the unit the API stores). Shared across the app so every money
 * input behaves identically.
 */
export function MoneyInput({
  value,
  onChange,
  className,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
  className?: string;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={centsToInput(value)}
      onChange={(event) => onChange(inputToCents(event.target.value))}
      placeholder="0.00"
      className={className}
    />
  );
}
