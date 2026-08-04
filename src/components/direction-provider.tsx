"use client";

import type { ReactNode } from "react";
import { Direction as RadixDirection } from "radix-ui";

import type { Direction } from "@/i18n/config";

/**
 * Feeds the resolved text direction to every Radix primitive (dropdowns, dialogs, popovers…)
 * so their positioning, keyboard nav, and animations mirror correctly in RTL. The `dir`
 * attribute on <html> drives CSS logical properties; this drives the JS-side behavior.
 */
export function DirectionProvider({
  dir,
  children,
}: {
  dir: Direction;
  children: ReactNode;
}) {
  return (
    <RadixDirection.Provider dir={dir}>{children}</RadixDirection.Provider>
  );
}
