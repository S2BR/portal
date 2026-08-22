/**
 * Live open/closed status from a business's `open_slots` — the absolute UTC 15-minute epoch slots the
 * API indexes (and returns on the public profile). Working from the same slot set the directory's
 * "open now" filter uses means one algorithm covers both surfaces, and overnight spans, split hours,
 * closures, and DST are already baked into the slots. Pure + time-injectable, so it's unit-testable.
 */

/** Seconds per indexed slot — mirrors `OpenNow::SECONDS_PER_SLOT` (15 minutes). */
export const SLOT_SECONDS = 900;

/** How close to a boundary counts as "soon" (Google-style ~1 hour). */
export const SOON_SECONDS = 60 * 60;

/**
 * The current absolute UTC epoch slot — mirrors `OpenNow::currentSlot` (floor(unix seconds / 900)) and
 * the "open now" toggle. A named function (not an inline `Date.now()`) so it can be called from a
 * `useMemo` without tripping the react-hooks purity rule.
 */
export function currentSlot(): number {
  return Math.floor(Date.now() / 1000 / SLOT_SECONDS);
}

export type OpenStatus = "open" | "closing_soon" | "opening_soon" | "closed";

export type OpenState = {
  status: OpenStatus;
  /**
   * The next boundary as a Unix epoch (seconds): the close time when open/closing-soon, the next open
   * time when opening-soon/closed. Null only when closed with no upcoming opening in the window.
   */
  changeAt: number | null;
};

/**
 * Resolve the current open/closed state from the sorted slot set.
 *
 * - **open** / **closing_soon** — `now` falls in a slot; `changeAt` is the end of that contiguous run
 *   (the closing time). Within `soonSeconds` of it ⇒ `closing_soon`.
 * - **opening_soon** / **closed** — `now` is outside every slot; `changeAt` is the next slot's start
 *   (the next opening), or null when none remains. Within `soonSeconds` of it ⇒ `opening_soon`.
 *
 * @param slots  Sorted, unique absolute epoch slots (as the API returns them).
 */
export function computeOpenState(
  slots: number[],
  now: Date,
  soonSeconds: number = SOON_SECONDS,
): OpenState {
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const nowSlot = Math.floor(nowSeconds / SLOT_SECONDS);
  const present = new Set(slots);

  if (present.has(nowSlot)) {
    // Walk to the end of the contiguous open run; the run's exclusive end is the closing time.
    let lastSlot = nowSlot;
    while (present.has(lastSlot + 1)) {
      lastSlot += 1;
    }
    const changeAt = (lastSlot + 1) * SLOT_SECONDS;
    const status =
      changeAt - nowSeconds <= soonSeconds ? "closing_soon" : "open";
    return { status, changeAt };
  }

  // Closed now — the next slot after `now` is the next opening (slots are sorted ascending).
  const nextSlot = slots.find((slot) => slot > nowSlot);
  if (nextSlot === undefined) {
    return { status: "closed", changeAt: null };
  }
  const changeAt = nextSlot * SLOT_SECONDS;
  const status =
    changeAt - nowSeconds <= soonSeconds ? "opening_soon" : "closed";
  return { status, changeAt };
}

/** Format a boundary epoch (seconds) as a local wall-clock time in the business's zone. */
export function formatBoundaryTime(
  epochSeconds: number,
  locale: string,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(epochSeconds * 1000));
}

/** Short weekday name for a boundary epoch, in the business's zone (e.g. "Mon"). */
export function formatBoundaryDay(
  epochSeconds: number,
  locale: string,
  timeZone?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone,
  }).format(new Date(epochSeconds * 1000));
}

/** Whether a boundary epoch falls on a different calendar day than `now`, in the business's zone. */
export function isDifferentDay(
  epochSeconds: number,
  now: Date,
  timeZone?: string,
): boolean {
  const key = (date: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    }).format(date);
  return key(new Date(epochSeconds * 1000)) !== key(now);
}
