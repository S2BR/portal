import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A Filament-style "aside" section: a title + short description on the left (~1/3), the fields on the
 * right (~2/3). Stacks to one column on mobile. Sections after the first in a container get a top
 * divider so a tab reads as separated panels (the first one has none). On desktop the divider spans
 * only the fields column (right), not the title; on mobile — where the two stack — it spans full
 * width. The `first:`-on-the-section overrides carry an extra `:first-child`, so they outrank the base
 * column rule by specificity regardless of source order.
 */
export function FormSection({
  id,
  title,
  description,
  children,
  className,
}: {
  /** Anchor id, so the preview rail can scroll-spy and jump to the section. */
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mt-10 grid gap-x-8 gap-y-4 first:mt-0 md:grid-cols-3",
        // Mobile (stacked): a full-width divider above the section.
        "border-border/60 border-t pt-10 first:border-t-0 first:pt-0",
        // Desktop: drop the full-width divider and put it above the fields column only, padding the
        // title column to match so the two still line up.
        "md:border-t-0 md:pt-0",
        "md:[&>div:last-child]:border-border/60 md:[&>div:last-child]:border-t md:[&>div:last-child]:pt-10 md:[&>div:first-child]:pt-10",
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
      <div data-section-fields className="space-y-5 md:col-span-2">
        {children}
      </div>
    </section>
  );
}
