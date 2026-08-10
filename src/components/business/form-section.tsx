import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A Filament-style "aside" section: a title + short description on the left (~1/3), the fields on the
 * right (~2/3). Stacks to one column on mobile. The fields sit in a muted tile that matches the
 * profile popup — a plain tile in read mode, a bordered block while editing — so every tab reads as
 * the same tile/block language. Sections are separated by the tile + the gap (no divider).
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
  /** Bordered block while editing; a plain muted tile in read mode. */
  editing?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "mt-8 grid gap-x-8 gap-y-3 first:mt-0 md:grid-cols-3",
        className,
      )}
    >
      <div className="md:col-span-1 md:pt-1">
        <h3 className="font-medium tracking-tight">{title}</h3>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      <div
        data-section-fields
        className={cn(
          "bg-muted/40 space-y-5 rounded-xl p-4 md:col-span-2",
          // A real border (not a ring) so it can't be clipped by an overflow ancestor.
          editing && "border-ring/50 border",
        )}
      >
        {children}
      </div>
    </section>
  );
}
