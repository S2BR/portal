/**
 * Up to two uppercase initials from a display name — first + last word ("Israel Pereira" →
 * "IP"), or the first two letters of a single word ("Madonna" → "MA"). Falls back to "?".
 */
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words.at(0);
  if (!first) {
    return "?";
  }
  if (words.length === 1) {
    return first.slice(0, 2).toUpperCase();
  }
  const last = words.at(-1) ?? first;
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
