import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A Filament-style "aside" section: a title + short description on the left (~1/3), the fields on the
 * right (~2/3). Stacks to one column on mobile. Sections after the first in a container get a top
 * divider so a tab reads as separated panels (the first one has none).
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
        "border-border/60 mt-10 grid gap-x-8 gap-y-4 border-t pt-10 first:mt-0 first:border-t-0 first:pt-0 md:grid-cols-3",
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
      <div className="space-y-5 md:col-span-2">{children}</div>
    </section>
  );
}
