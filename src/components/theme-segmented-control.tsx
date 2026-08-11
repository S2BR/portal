"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";
import { cn } from "@/lib/utils";

const MODES: { value: ThemeSelection; Icon: LucideIcon }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

/**
 * A segmented (pill) theme switcher with light / dark / system, mirroring the Filament panel.
 * Each segment still transitions the page with the gradual clip-path wipe (it wraps the same
 * ThemeToggler primitive), and the active segment is raised.
 */
export function ThemeSegmentedControl({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <ThemeToggler
      theme={theme as ThemeSelection | undefined}
      resolvedTheme={resolvedTheme as Resolved | undefined}
      setTheme={setTheme}
    >
      {({ effective, toggleTheme }) => (
        <div
          role="group"
          aria-label={t("label")}
          className={cn(
            "bg-muted flex items-center gap-1 rounded-lg p-1",
            className,
          )}
        >
          {MODES.map(({ value, Icon }) => {
            const active = effective === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                aria-label={t(value)}
                title={t(value)}
                onClick={() => toggleTheme(value)}
                className={cn(
                  "focus-visible:ring-ring flex h-8 flex-1 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </button>
            );
          })}
        </div>
      )}
    </ThemeToggler>
  );
}
