/**
 * Pure helpers for the directory's star (rating) filter — kept out of the connector component so the
 * row-building logic is unit-testable without an InstantSearch context.
 */

/** Star thresholds shown, high → low. Each means "this many stars or better" (`rating_avg >= N`). */
export const STAR_LEVELS = [4, 3, 2, 1] as const;

/** The `useNumericMenu` item shape this module reads. */
export type NumericMenuItem = {
  label: string;
  value: string;
  isRefined: boolean;
};

/** One rendered star row: the threshold, the value to refine to, and whether it's active. */
export type StarRow = { stars: number; value: string; isRefined: boolean };

/**
 * Turn `useNumericMenu` items into ordered star rows (4★ → 1★) plus the "clear" value — the
 * untargeted "all" item — used to toggle the active row back off. Items whose label isn't a known
 * star level are ignored.
 */
export function toStarRows(items: NumericMenuItem[]): {
  rows: StarRow[];
  clearValue: string | null;
} {
  const clearValue = items.find((item) => item.label === "all")?.value ?? null;
  const rows = STAR_LEVELS.flatMap((stars) => {
    const item = items.find((candidate) => candidate.label === String(stars));
    return item
      ? [{ stars, value: item.value, isRefined: item.isRefined }]
      : [];
  });
  return { rows, clearValue };
}
