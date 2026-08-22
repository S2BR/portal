/**
 * Return only the top-level keys whose value differs from the baseline, compared by structural JSON
 * equality. Used to PATCH just the sections a user actually changed — the API treats any omitted
 * section as "leave untouched", so sending less is safe and much cheaper.
 *
 * Both objects must be produced the same way (stable key order), so the JSON comparison is reliable.
 * A real change always differs and is always included; the only failure mode is including a section
 * that happens to be unchanged, which is harmless.
 */
export function pickChanged<T extends Record<string, unknown>>(
  current: T,
  baseline: T,
): Partial<T> {
  const changed: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (JSON.stringify(current[key]) !== JSON.stringify(baseline[key])) {
      changed[key] = current[key];
    }
  }
  return changed;
}
