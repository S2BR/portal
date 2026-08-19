/** A user's preferred distance unit. */
export type DistanceUnit = "km" | "mi";

const METERS_PER_MILE = 1609.344;
const FEET_PER_METER = 3.28084;

/** Resolve a possibly-null preference to a concrete unit (km is the default). */
export function resolveDistanceUnit(
  unit: DistanceUnit | null | undefined,
): DistanceUnit {
  return unit === "mi" ? "mi" : "km";
}

/**
 * Format a distance (in metres) in the user's preferred unit, switching to the sub-unit (metres /
 * feet) up close. Returns the localized string via the passed `t` — the directory's
 * distance* message keys.
 */
export function formatDistance(
  meters: number,
  unit: DistanceUnit,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (unit === "mi") {
    const miles = meters / METERS_PER_MILE;
    return miles < 0.1
      ? t("distanceFt", { ft: Math.round(meters * FEET_PER_METER) })
      : t("distanceMi", { mi: miles.toFixed(1) });
  }
  return meters < 1000
    ? t("distanceM", { m: Math.round(meters) })
    : t("distanceKm", { km: (meters / 1000).toFixed(1) });
}

/** Format a whole-unit radius (the "near me" options), e.g. 25 → "25 km" / "16 mi". */
export function formatRadius(
  km: number,
  unit: DistanceUnit,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return unit === "mi"
    ? t("distanceMi", { mi: Math.round((km * 1000) / METERS_PER_MILE) })
    : t("distanceKm", { km });
}
