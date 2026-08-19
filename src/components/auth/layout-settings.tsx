"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import { LanguageCards } from "@/components/auth/language-cards";
import { PreviewCard } from "@/components/ui/preview-card";
import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";
import { setDirection, setLocale } from "@/i18n/actions";
import { isLocale, locales, type Direction, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** A labeled settings group: heading + short description, then its controls. */
function Group({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-xs text-pretty">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/** A theme swatch drawn in fixed light/dark colors so it previews the theme regardless of the current one. */
function ThemePane({ dark }: { dark: boolean }) {
  return (
    <div
      className={cn(
        "flex h-full flex-col gap-1 p-2",
        dark ? "bg-neutral-900" : "bg-white",
      )}
    >
      <div
        className={cn(
          "h-1 w-6 animate-pulse rounded-full motion-reduce:animate-none",
          dark ? "bg-neutral-600" : "bg-neutral-300",
        )}
      />
      <div
        className={cn(
          "h-1 w-full animate-pulse rounded-full [animation-delay:150ms] motion-reduce:animate-none",
          dark ? "bg-neutral-700" : "bg-neutral-200",
        )}
      />
      <div
        className={cn(
          "h-1 w-4/5 animate-pulse rounded-full [animation-delay:300ms] motion-reduce:animate-none",
          dark ? "bg-neutral-700" : "bg-neutral-200",
        )}
      />
      <div
        className={cn(
          "mt-auto h-2.5 w-8 animate-pulse rounded [animation-delay:450ms] motion-reduce:animate-none",
          dark ? "bg-neutral-100" : "bg-neutral-800",
        )}
      />
    </div>
  );
}

function ThemeMock({ mode }: { mode: ThemeSelection }) {
  if (mode === "system") {
    // A diagonal light/dark split. Dark fills the whole box so every edge is fully covered
    // (no antialiased sliver of the pane beneath showing at the right/bottom), and the light
    // half is overlaid as the top-left triangle.
    return (
      <div className="relative h-14 w-full">
        <ThemePane dark />
        <div
          className="absolute inset-0"
          // Diagonal stays exactly corner-to-corner (top-right → bottom-left); the top-left vertex
          // is pushed far outside so the light half's straight edges never sit on a container edge
          // (no antialiased sliver of the dark base showing through at the top/left).
          style={{ clipPath: "polygon(-50% -50%, 100% 0, 0% 100%)" }}
        >
          <ThemePane dark={false} />
        </div>
      </div>
    );
  }
  return (
    <div className="h-14 w-full">
      <ThemePane dark={mode === "dark"} />
    </div>
  );
}

/** A mini page layout that mirrors with `dir` — sidebar + text lines flow to the start edge. */
function DirectionMock({ dir }: { dir: Direction }) {
  return (
    <div
      dir={dir}
      className="bg-background flex h-14 w-full items-stretch gap-1.5 p-2"
    >
      <div className="bg-muted-foreground/25 h-full w-2.5 shrink-0 animate-pulse rounded motion-reduce:animate-none" />
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="bg-muted-foreground/20 h-1 w-full animate-pulse rounded-full [animation-delay:150ms] motion-reduce:animate-none" />
        <div className="bg-muted-foreground/20 h-1 w-4/5 animate-pulse rounded-full [animation-delay:300ms] motion-reduce:animate-none" />
        <div className="bg-muted-foreground/20 h-1 w-3/5 animate-pulse rounded-full [animation-delay:450ms] motion-reduce:animate-none" />
      </div>
    </div>
  );
}

/**
 * The "Layout" settings tab: theme, text direction, and language — each a row of clickable preview
 * cards. Theme uses the shared {@link ThemeToggler} (keeping the clip-path wipe); direction and
 * language persist via server actions ({@link setDirection} / {@link setLocale}) then refresh.
 */
export function LayoutSettings() {
  const t = useTranslations("layoutSettings");
  const themeT = useTranslations("theme");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const locale = useLocale();
  const activeLocale = isLocale(locale) ? locale : locales[0];

  // Direction lives on <html dir> (from a cookie). Read it once the dialog mounts; update
  // optimistically on click so the selection feels instant before the refresh lands.
  const [dir, setDir] = useState<Direction>("ltr");
  useEffect(() => {
    const current = document.documentElement.getAttribute("dir");
    if (current === "rtl" || current === "ltr") {
      // Syncing local state from the DOM once on mount is the intent here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDir(current);
    }
  }, []);

  function selectLocale(next: Locale) {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  function selectDirection(next: Direction) {
    setDir(next);
    startTransition(async () => {
      await setDirection(next);
      router.refresh();
    });
  }

  const themeModes: ThemeSelection[] = ["light", "dark", "system"];
  const directions: Direction[] = ["ltr", "rtl"];

  return (
    <div className="space-y-8">
      <Group title={t("theme.title")} description={t("theme.description")}>
        <ThemeToggler
          theme={theme as ThemeSelection | undefined}
          resolvedTheme={resolvedTheme as Resolved | undefined}
          setTheme={setTheme}
        >
          {({ effective, toggleTheme }) => (
            <div className="grid grid-cols-3 gap-3">
              {themeModes.map((mode) => (
                <PreviewCard
                  key={mode}
                  selected={effective === mode}
                  onClick={() => toggleTheme(mode)}
                  label={themeT(mode)}
                >
                  <ThemeMock mode={mode} />
                </PreviewCard>
              ))}
            </div>
          )}
        </ThemeToggler>
      </Group>

      <Group
        title={t("direction.title")}
        description={t("direction.description")}
      >
        <div className="grid grid-cols-2 gap-3">
          {directions.map((option) => (
            <PreviewCard
              key={option}
              selected={dir === option}
              onClick={() => selectDirection(option)}
              label={t(`direction.${option}`)}
            >
              <DirectionMock dir={option} />
            </PreviewCard>
          ))}
        </div>
      </Group>

      <Group
        title={t("language.title")}
        description={t("language.description")}
      >
        <LanguageCards value={activeLocale} onSelect={selectLocale} />
      </Group>
    </div>
  );
}
