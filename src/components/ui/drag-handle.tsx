"use client";

import { GripVertical } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * The grip that starts a drag. With dnd-kit the sortable item's activator listeners/attributes are
 * spread onto this button (and its ref is the activator node), so only the handle initiates a drag —
 * the rest of the row stays interactive. `touch-none` stops a touch-drag from scrolling the page.
 */
export const DragHandle = forwardRef<
  HTMLButtonElement,
  { label: string } & ButtonHTMLAttributes<HTMLButtonElement>
>(function DragHandle({ label, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "text-muted-foreground/50 hover:text-foreground focus-visible:ring-ring shrink-0 cursor-grab touch-none rounded outline-none focus-visible:ring-2 active:cursor-grabbing",
        className,
      )}
      {...props}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  );
});

/**
 * The empty **drop slot** left in the list while dragging: just a very light gray fill (the same
 * `bg-muted/40` used by the business-type selector), no border, marking where the item will land. The
 * item's real content rides in the DragOverlay ({@link overlayClass}), not here.
 */
export const placeholderClass = "bg-muted/40 rounded-md";

/**
 * The floating card under the cursor while dragging — the lifted item. A translucent, blurred fill
 * (frosted glass) so the rows it passes over stay faintly visible, with a thin dashed medium-gray
 * border and a lift shadow.
 */
export const overlayClass =
  "bg-background/60 border-muted-foreground/50 cursor-grabbing rounded-md border border-dashed shadow-lg backdrop-blur-sm";
