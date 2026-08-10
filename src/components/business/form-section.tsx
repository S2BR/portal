import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A Filament-style "aside" section: a title + short description on the left (~1/3), the fields on the
 * right (~2/3). Stacks to one column on mobile.
 *
 * Both modes carry the same between-section divider: on desktop a hairline above the **fields column
 * only** (never under the title), and full-width when the columns stack on mobile. Read mode adds a
 * muted rounded tile around the values (matching the profile popup); the edit form is left plain.
 */
export function FormSection({
  id,
  title,
  description,
  editing = false,
  children,
  className,
}: {
  /** Anchor id, so the preview rail can scroll-spy and jump to the section. */
  id?: string;
  title: string;
  description?: string;
  /** Read mode tiles the values; edit mode keeps the plain form. */
  editing?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid gap-x-8 md:grid-cols-3",
        editing ? "mt-10 gap-y-4" : "mt-8 gap-y-3",
        "first:mt-0",
        // Mobile (stacked): a full-width divider above the section.
        "border-border/60 border-t pt-8 first:border-t-0 first:pt-0",
        // Desktop: no section-level divider; instead a hairline above the fields
        // column only (last child), with the title padded to line up.
        "md:border-t-0 md:pt-0",
        "md:[&>div:last-child]:border-border/60 md:[&>div:last-child]:border-t md:[&>div:last-child]:pt-8 md:[&>div:first-child]:pt-8",
        "md:first:[&>div:last-child]:border-t-0 md:first:[&>div:last-child]:pt-0 md:first:[&>div:first-child]:pt-0",
        className,
      )}
    >
      <div className="md:col-span-1">
        <h3 className="font-medium tracking-tight">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {/* The fields cell carries the divider; the tile nests inside so the rule
          sits in the gap above it rather than on the tile's own edge. */}
      <div className="md:col-span-2">
        <div
          data-section-fields
          className={cn(
            "space-y-5",
            // Read mode only: the values sit in a muted tile.
            !editing && "bg-muted/40 rounded-xl p-4",
          )}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
