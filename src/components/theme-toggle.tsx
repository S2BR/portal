"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";

const MODES: { value: ThemeSelection; Icon: LucideIcon }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

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
 * Theme control as a dropdown menu (light / dark / system). Picking an option transitions the
 * whole page with the gradual clip-path wipe (it wraps the ThemeToggler primitive). Used on the
 * auth and legal screens; the authenticated app houses the theme control in the user menu.
 */
export function ThemeToggle({
  variant = "ghost",
}: {
  variant?: "outline" | "ghost";
} = {}) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");

  return (
    <ThemeToggler
      theme={theme as ThemeSelection | undefined}
      resolvedTheme={resolvedTheme as Resolved | undefined}
      setTheme={setTheme}
    >
      {({ effective, toggleTheme }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size="icon" aria-label={t("label")}>
              {iconFor(effective)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-40">
            {MODES.map(({ value, Icon }) => (
              <DropdownMenuItem key={value} onClick={() => toggleTheme(value)}>
                <Icon className="size-4" />
                {t(value)}
                {effective === value ? (
                  <span
                    className="bg-brand-green ms-auto size-2 shrink-0 rounded-full"
                    aria-hidden
                  />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ThemeToggler>
  );
}
