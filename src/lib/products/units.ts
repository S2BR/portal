/**
 * The units a product SKU can be measured in — the client mirror of the API's `Unit` enum (same
 * codes). Ordered by family (count, mass, volume, length) with "other" last. `symbol` is the universal
 * display token (no translation); the full name is localized via the `units.<code>` message key.
 */
export type UnitCode =
  | "ea"
  | "un"
  | "pc"
  | "pk"
  | "dz"
  | "mg"
  | "g"
  | "kg"
  | "oz"
  | "lb"
  | "ml"
  | "cl"
  | "l"
  | "floz"
  | "pt"
  | "qt"
  | "gal"
  | "mm"
  | "cm"
  | "m"
  | "other";

export interface UnitDef {
  code: UnitCode;
  /** Universal display symbol (e.g. "L", "kg"); null for "other" (name only). */
  symbol: string | null;
}

export const UNITS: UnitDef[] = [
  // Count
  { code: "ea", symbol: "ea" },
  { code: "un", symbol: "un" },
  { code: "pc", symbol: "pc" },
  { code: "pk", symbol: "pk" },
  { code: "dz", symbol: "dz" },
  // Mass
  { code: "mg", symbol: "mg" },
  { code: "g", symbol: "g" },
  { code: "kg", symbol: "kg" },
  { code: "oz", symbol: "oz" },
  { code: "lb", symbol: "lb" },
  // Volume
  { code: "ml", symbol: "ml" },
  { code: "cl", symbol: "cl" },
  { code: "l", symbol: "L" },
  { code: "floz", symbol: "fl oz" },
  { code: "pt", symbol: "pt" },
  { code: "qt", symbol: "qt" },
  { code: "gal", symbol: "gal" },
  // Length
  { code: "mm", symbol: "mm" },
  { code: "cm", symbol: "cm" },
  { code: "m", symbol: "m" },
  // Fallback
  { code: "other", symbol: null },
];

const BY_CODE = new Map(UNITS.map((unit) => [unit.code, unit]));

/** The unit for a code, or undefined (e.g. legacy/unknown values). */
export function unitFor(code: string | null | undefined): UnitDef | undefined {
  return code ? BY_CODE.get(code as UnitCode) : undefined;
}
