"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useState } from "react";

import { ThemeSegmentedControl } from "@/components/theme-segmented-control";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";

function iconFor(mode: ThemeSelection) {
  if (mode === "light") {
    return <Sun className="size-4" />;
  }
  if (mode === "dark") {
    return <Moon className="size-4" />;
  }
  return <Monitor className="size-4" />;
}

/**
 * Theme control for the unauthenticated header: a compact icon button that opens the SAME segmented
 * light/dark/system switcher used inside the user menu, behind a soft blur scrim — mirroring the
 * language switcher. The authenticated app keeps its theme control in the user menu instead.
 */
export function ThemeToggle({
  variant = "ghost",
}: {
  variant?: "outline" | "ghost";
} = {}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const [open, setOpen] = useState(false);

  return (
    <ThemeToggler
      theme={theme as ThemeSelection | undefined}
      resolvedTheme={resolvedTheme as Resolved | undefined}
      setTheme={setTheme}
    >
      {({ effective }) => (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant={variant} size="icon" aria-label={t("label")}>
              {iconFor(effective)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3">
            {/* The exact presentation used inside the user menu: a small label over the control. */}
            <p className="text-muted-foreground mb-1.5 px-0.5 text-xs font-medium">
              {t("label")}
            </p>
            <ThemeSegmentedControl />
          </PopoverContent>
        </Popover>
      )}
    </ThemeToggler>
  );
}
