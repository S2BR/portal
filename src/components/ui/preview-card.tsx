"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A selectable option rendered as a small visual preview (top) plus a label (bottom). The cards use
 * a three-step gray (default → hover → selected); the selected one is marked with a brand-green dot.
 * Shared by the layout settings (theme/direction/language) and the profile language picker.
 */
export function PreviewCard({
  selected,
  onClick,
  label,
  framed = true,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  /** Wrap the preview in a bordered box (theme/direction mockups). Off for the round flag. */
  framed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "focus-visible:ring-ring flex flex-col rounded-xl p-1.5 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset",
        // Three-step gray: default (muted/40) → hover (muted/70) → selected
        // (muted-foreground/10). The brand-green dot marks the selection.
        selected ? "bg-muted-foreground/10" : "bg-muted/40 hover:bg-muted/70",
      )}
    >
      {framed ? (
        <div className="overflow-hidden rounded-lg">{children}</div>
      ) : (
        children
      )}
      <div className="flex items-center gap-1.5 px-1 pt-2 pb-0.5">
        <span className="truncate text-[11px] font-semibold">{label}</span>
        {selected ? (
          <span
            className="bg-brand-green ms-auto size-2 shrink-0 rounded-full"
            aria-hidden
          />
        ) : null}
      </div>
    </button>
  );
}
