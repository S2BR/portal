"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition, type ReactNode } from "react";

import {
  ThemeToggler,
  type Resolved,
  type ThemeSelection,
} from "@/components/ui/theme-toggler";
import { setDirection, setLocale } from "@/i18n/actions";
import {
  isLocale,
  localeNames,
  locales,
  type Direction,
  type Locale,
} from "@/i18n/config";
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
        <h3 className="font-medium tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-sm text-pretty">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

/**
 * A selectable option rendered as a small visual preview (top) plus a label (bottom). The cards use
 * a three-step gray (default → hover → selected); the selected one is marked with a brand-green dot.
 */
function PreviewCard({
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
          "h-1 w-6 rounded-full",
          dark ? "bg-neutral-600" : "bg-neutral-300",
        )}
      />
      <div
        className={cn(
          "h-1 w-full rounded-full",
          dark ? "bg-neutral-700" : "bg-neutral-200",
        )}
      />
      <div
        className={cn(
          "h-1 w-4/5 rounded-full",
          dark ? "bg-neutral-700" : "bg-neutral-200",
        )}
      />
      <div
        className={cn(
          "mt-auto h-2.5 w-8 rounded",
          dark ? "bg-neutral-100" : "bg-neutral-800",
        )}
      />
    </div>
  );
}

function ThemeMock({ mode }: { mode: ThemeSelection }) {
  if (mode === "system") {
    // A diagonal light/dark split: light fills, dark overlays the bottom-right triangle.
    return (
      <div className="relative h-14 w-full">
        <ThemePane dark={false} />
        <div
          className="absolute inset-0"
          style={{ clipPath: "polygon(100% 0, 100% 100%, 0% 100%)" }}
        >
          <ThemePane dark />
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
      <div className="bg-muted-foreground/25 h-full w-2.5 shrink-0 rounded" />
      <div className="flex flex-1 flex-col justify-center gap-1.5">
        <div className="bg-muted-foreground/20 h-1 w-full rounded-full" />
        <div className="bg-muted-foreground/20 h-1 w-4/5 rounded-full" />
        <div className="bg-muted-foreground/20 h-1 w-3/5 rounded-full" />
      </div>
    </div>
  );
}

function LanguageMock({ locale }: { locale: Locale }) {
  return (
    <div className="flex h-14 items-center justify-center">
      {/* A round flag (no bordered box) so the shape echoes the flag. Decorative — the native
          name is the card label. A plain <img> paints the cached flag instantly. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/images/flags/${locale}.png`}
        alt=""
        width={44}
        height={44}
        className="ring-border/60 size-11 rounded-full object-cover shadow-sm ring-1"
      />
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
        <div className="grid grid-cols-4 gap-3">
          {locales.map((option) => (
            <PreviewCard
              key={option}
              selected={option === activeLocale}
              onClick={() => selectLocale(option)}
              framed={false}
              // Drop the parenthetical region (e.g. "Français (Canada)" → "Français")
              // so all four fit on one row — the flag already conveys the region.
              label={localeNames[option].replace(/\s*\(.+\)$/, "")}
            >
              <LanguageMock locale={option} />
            </PreviewCard>
          ))}
        </div>
      </Group>
    </div>
  );
}
