/**
 * Client mirror of the API's "closure can't be in the past" rule, evaluated in the business's own
 * timezone — so the editor can block a past special date up front instead of letting the optimistic
 * save flash "saved" and then be rejected by the server.
 */

/** Minutes since midnight for an `HH:MM` string, or null when malformed. */
function minutesOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) {
    return null;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) {
    return null;
  }
  return hours * 60 + minutes;
}

/** The current date (`YYYY-MM-DD`) and minute-of-day in a timezone — the business-local "now". */
function nowInTimezone(
  timezone: string | undefined,
  now: Date,
): { today: string; nowMinutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const today = `${get("year")}-${get("month")}-${get("day")}`;
  // `hour12:false` can render midnight as "24" in some engines.
  const nowMinutes = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  return { today, nowMinutes };
}

/**
 * Whether a one-off closure is already past in the given (business) timezone. Its date has gone by,
 * or — for a single TODAY date carrying special hours — every window has already closed. Still open
 * (22:00–23:30 at 23:00), overnight (runs into tomorrow), closed-all-day today, a range that extends
 * past today, and any future date are NOT past. Recurring closures are never past.
 */
export function closureIsPast(
  closure: {
    startDate: string;
    endDate: string;
    isRecurring: boolean;
    hours: { open: string; close: string }[];
  },
  timezone: string | undefined,
  now: Date = new Date(),
): boolean {
  if (closure.isRecurring || !closure.startDate) {
    return false;
  }

  const { today, nowMinutes } = nowInTimezone(timezone, now);
  if (closure.startDate < today) {
    return true;
  }
  if (closure.startDate > today) {
    return false;
  }

  // start == today: a multi-day range still reaches into the future.
  const end = closure.endDate || closure.startDate;
  if (end > today) {
    return false;
  }

  if (!closure.hours || closure.hours.length === 0) {
    return false; // closed all day today — a valid same-day closure
  }

  for (const window of closure.hours) {
    const open = minutesOfDay(window.open);
    const close = minutesOfDay(window.close);
    if (open === null || close === null) {
      continue;
    }
    if (close <= open) {
      return false; // overnight — runs into tomorrow, still upcoming
    }
    if (close > nowMinutes) {
      return false; // still open now, or upcoming later today
    }
  }

  return true; // every window is same-day and already closed
}

/**
 * Whether any of a closure's special-hour windows has a close time that isn't strictly after its open
 * time — the client mirror of the API's `after:open` rule, so an invalid window is caught before the
 * save instead of coming back as a 422.
 */
export function closureHasInvalidWindow(closure: {
  hours: { open: string; close: string }[];
}): boolean {
  return closure.hours.some((window) => {
    const open = minutesOfDay(window.open);
    const close = minutesOfDay(window.close);
    return open !== null && close !== null && close <= open;
  });
}

type ClosureLike = {
  startDate: string;
  endDate: string;
  isRecurring: boolean;
  hours: { open: string; close: string }[];
};

/**
 * Whether a one-off closure is elapsed history: its range ended before today, or — for a range ending
 * TODAY — today's last window has already closed. Unlike `closureIsPast` (which is start-based, so an
 * ongoing multi-day range reads as "past"), this is END-based: an ongoing range whose end is
 * today-or-later is NOT history and stays editable. Recurring closures are never history.
 *
 * The editor hides history (it's owned by the daily server prune job, not the user), and the server
 * mirrors this exactly (`closureModelIsElapsedHistory`) to preserve those rows through a sync.
 */
export function closureIsElapsedHistory(
  closure: ClosureLike,
  timezone: string | undefined,
  now: Date = new Date(),
): boolean {
  if (closure.isRecurring || !closure.startDate) {
    return false;
  }

  const { today, nowMinutes } = nowInTimezone(timezone, now);
  const end = closure.endDate || closure.startDate;

  if (end < today) {
    return true;
  }
  if (end > today) {
    return false;
  }

  // Ends today: history only once every same-day window has closed (closed-all-day stays through the
  // day; an overnight or still-open window keeps it live).
  if (!closure.hours || closure.hours.length === 0) {
    return false;
  }
  for (const window of closure.hours) {
    const open = minutesOfDay(window.open);
    const close = minutesOfDay(window.close);
    if (open === null || close === null) {
      continue;
    }
    if (close <= open) {
      return false;
    }
    if (close > nowMinutes) {
      return false;
    }
  }
  return true;
}

/**
 * The blocking error (if any) to raise before a business save, given the closures the editor holds.
 *
 * CRITICAL: closures are validated ONLY when the closures section is actually being sent
 * (`closuresChanged`). A pre-existing special date that has since elapsed is untouched history — it
 * stays out of the PATCH payload, so it must never block an unrelated edit (a category suggestion, a
 * phone number). Validating regardless of what changed was a real bug: every save got blocked by an
 * old past date the user wasn't touching. Returns `"past"`, `"hours"`, or null (nothing to block).
 */
export function closureSaveError(
  closures: ClosureLike[],
  timezone: string | undefined,
  closuresChanged: boolean,
  now: Date = new Date(),
): "past" | "hours" | null {
  if (!closuresChanged) {
    return null;
  }
  if (closures.some((closure) => closureIsPast(closure, timezone, now))) {
    return "past";
  }
  if (closures.some((closure) => closureHasInvalidWindow(closure))) {
    return "hours";
  }
  return null;
}
