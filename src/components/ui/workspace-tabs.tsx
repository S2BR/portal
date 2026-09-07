"use client";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** One tab in a {@link WorkspaceTabs} strip. */
export interface WorkspaceTabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** A small dot on the trigger (e.g. unsaved changes on that tab). */
  indicator?: boolean;
  indicatorLabel?: string;
}

/**
 * The shared tab strip for the business workspace — one centered, pill-style `TabsList` reused across
 * the admin (business editor, owner products) so every screen's tabs look identical instead of each
 * page hand-rolling its own. Pass the tab items; render the matching `<TabsContent>` blocks as
 * children.
 */
export function WorkspaceTabs({
  value,
  onValueChange,
  items,
  className,
  listClassName,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  items: WorkspaceTabItem[];
  className?: string;
  listClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={className}>
      <TabsList className={cn("mx-auto w-fit max-w-full", listClassName)}>
        {items.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value}>
            {tab.icon ? <tab.icon className="size-4" aria-hidden /> : null}
            {tab.label}
            {tab.indicator ? (
              <span
                className="bg-brand-gold size-1.5 shrink-0 rounded-full"
                aria-label={tab.indicatorLabel}
              />
            ) : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  );
}
