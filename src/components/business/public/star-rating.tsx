import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A read-only star rating (0–5). Renders five outlined stars with a gold overlay clipped to the
 * exact fraction, so a 4.6 shows a precise partial fill. Purely presentational — pass an accessible
 * label alongside (the numeric value is shown as text), so the stars themselves are aria-hidden.
 */
export function StarRating({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const stars = [0, 1, 2, 3, 4];
  const dimensions = { width: size, height: size };

  return (
    <span
      aria-hidden
      className={cn("relative inline-flex shrink-0", className)}
    >
      <span className="text-muted-foreground/25 flex">
        {stars.map((i) => (
          <Star key={i} style={dimensions} className="fill-current stroke-0" />
        ))}
      </span>
      <span
        className="text-brand-gold absolute inset-0 flex overflow-hidden"
        style={{ width: `${pct}%` }}
      >
        {stars.map((i) => (
          <Star
            key={i}
            style={dimensions}
            className="shrink-0 fill-current stroke-0"
          />
        ))}
      </span>
    </span>
  );
}
