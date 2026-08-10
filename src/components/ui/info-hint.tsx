"use client";

import { Info } from "lucide-react";
import * as React from "react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A small "(i)" affordance that reveals a short explanatory text. It opens on
 * hover for mouse users and on click/tap for everyone (touch included), so the
 * same control works across devices. Hover is gated to `pointerType === "mouse"`
 * so a tap doesn't open-then-close via the pointer-enter/click sequence.
 */
export function InfoHint({
  text,
  label,
  className,
  contentClassName,
}: {
  text: string;
  /** Accessible name for the icon button (e.g. "More information"). */
  label: string;
  className?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          onClick={(event) => event.stopPropagation()}
          onPointerEnter={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(true);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === "mouse") {
              setOpen(false);
            }
          }}
          className={cn(
            "text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-6 items-center justify-center rounded-full transition-colors outline-none focus-visible:ring-2",
            className,
          )}
        >
          <Info className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={6}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className={cn(
          "text-muted-foreground w-64 p-3 text-sm leading-relaxed text-pretty",
          contentClassName,
        )}
      >
        {text}
      </PopoverContent>
    </Popover>
  );
}
