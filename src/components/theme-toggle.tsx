"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";

const MODES: ThemeSelection[] = ["light", "dark", "system"];

function iconFor(mode: ThemeSelection) {
  if (mode === "system") {
    return <Monitor className="size-4" />;
  }
  if (mode === "dark") {
    return <Moon className="size-4" />;
  }
  return <Sun className="size-4" />;
}

function nextMode(mode: ThemeSelection): ThemeSelection {
  const index = MODES.indexOf(mode);
  return MODES[(index + 1) % MODES.length] ?? "system";
}

/**
 * Theme control: cycles light → dark → system, transitioning the whole page with a gradual
 * clip-path wipe (View Transitions API). The icon reflects the current mode.
 */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <ThemeToggler
      theme={theme as ThemeSelection | undefined}
      resolvedTheme={resolvedTheme as Resolved | undefined}
      setTheme={setTheme}
      direction="ltr"
    >
      {({ effective, toggleTheme }) => (
        <Button
          variant="outline"
          size="icon"
          aria-label={t("label")}
          title={t(effective)}
          onClick={() => toggleTheme(nextMode(effective))}
        >
          {iconFor(effective)}
        </Button>
      )}
    </ThemeToggler>
  );
}
