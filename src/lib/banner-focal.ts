import type { BannerFocal } from "@/app/api/businesses/route";

/** Where a banner sits when no focal point is stored. */
export const CENTER_FOCAL: BannerFocal = { x: 50, y: 50 };

/** Clamp a focal coordinate into the valid `object-position` range. */
export function clampFocal(value: number): number {
  return Math.min(100, Math.max(0, value));
}

/** A CSS `object-position` value from a focal point (percentages); centered when null. */
export function focalObjectPosition(
  focal: BannerFocal | null | undefined,
): string {
  const x = focal?.x ?? CENTER_FOCAL.x;
  const y = focal?.y ?? CENTER_FOCAL.y;
  return `${x}% ${y}%`;
}
