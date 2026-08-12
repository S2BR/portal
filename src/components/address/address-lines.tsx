import { cn } from "@/lib/utils";

/**
 * The shared address rendering used by both the read view and the editor's collapsed peek, so the
 * two always match: the first line (the street) in bold, and the rest — city, postal code, country —
 * in muted gray. Pass already-formatted lines (from `formatBusinessAddress`).
 */
export function AddressLines({
  lines,
  truncate = false,
  className,
}: {
  lines: string[];
  truncate?: boolean;
  className?: string;
}) {
  return (
    <address
      className={cn("space-y-0.5 text-sm leading-relaxed not-italic", className)}
    >
      {lines.map((line, index) => (
        <span
          key={line}
          className={cn(
            "block",
            truncate && "truncate",
            index === 0 ? "font-semibold" : "text-muted-foreground",
          )}
        >
          {line}
        </span>
      ))}
    </address>
  );
}
