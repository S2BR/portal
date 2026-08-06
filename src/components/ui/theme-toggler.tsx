"use client";

import * as React from "react";
import { flushSync } from "react-dom";

export type ThemeSelection = "light" | "dark" | "system";
export type Resolved = "light" | "dark";
export type Direction = "btt" | "ttb" | "ltr" | "rtl";

type ChildrenRender =
  | React.ReactNode
  | ((state: {
      resolved: Resolved;
      effective: ThemeSelection;
      toggleTheme: (theme: ThemeSelection) => void;
    }) => React.ReactNode);

function getSystemEffective(): Resolved {
  if (typeof window === "undefined") {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function getClipKeyframes(direction: Direction): [string, string] {
  switch (direction) {
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"];
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"];
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"];
    case "ltr":
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"];
  }
}

export type ThemeTogglerProps = {
  theme: ThemeSelection | undefined;
  resolvedTheme: Resolved | undefined;
  setTheme: (theme: ThemeSelection) => void;
  direction?: Direction;
  onImmediateChange?: (theme: ThemeSelection) => void;
  children?: ChildrenRender;
};

/**
 * Gradually switches the theme with a directional clip-path wipe via the View Transitions API
 * (adapted from Animate UI's theme-toggler effect). Falls back to an instant switch when the API
 * is unavailable or the user prefers reduced motion.
 *
 * The shown state is DERIVED from `preview ?? the real theme` — no mirrored state, so the icon is
 * correct on first load and there are no state-syncing effects. `preview` holds the incoming theme
 * only while a transition is in flight (so the class can flip mid-wipe), then clears.
 */
export function ThemeToggler({
  theme,
  resolvedTheme,
  setTheme,
  onImmediateChange,
  direction = "ltr",
  children,
}: ThemeTogglerProps) {
  const [preview, setPreview] = React.useState<null | {
    effective: ThemeSelection;
    resolved: Resolved;
  }>(null);

  // next-themes can't know the theme on the server, so `theme`/`resolvedTheme` are only
  // trustworthy after mount. Until then we render the same SSR-safe defaults the server did —
  // otherwise a viewer whose system/stored theme differs from the server default (e.g. dark-mode
  // Safari) mismatches on hydration and the theme-dependent icon/active state is regenerated.
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    // Mount detection: flipping this after hydration is the whole point.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [fromClip, toClip] = getClipKeyframes(direction);

  const toggleTheme = React.useCallback(
    async (next: ThemeSelection) => {
      const resolved = next === "system" ? getSystemEffective() : next;
      onImmediateChange?.(next);

      // Nothing visible changes, or we can't / shouldn't animate → switch instantly.
      if (
        (next === "system" && resolved === resolvedTheme) ||
        !document.startViewTransition ||
        prefersReducedMotion()
      ) {
        setTheme(next);
        return;
      }

      await document.startViewTransition(() => {
        flushSync(() => {
          setPreview({ effective: next, resolved });
          document.documentElement.classList.toggle(
            "dark",
            resolved === "dark",
          );
        });
      }).ready;

      document.documentElement
        .animate(
          { clipPath: [fromClip, toClip] },
          {
            duration: 700,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          },
        )
        .finished.finally(() => {
          // Commit to next-themes and drop the preview in one batch, so the shown state falls
          // back to the (now-matching) real theme without a flicker.
          setTheme(next);
          setPreview(null);
        });
    },
    [onImmediateChange, resolvedTheme, fromClip, toClip, setTheme],
  );

  const effective: ThemeSelection = mounted
    ? (preview?.effective ?? theme ?? "system")
    : "system";
  const resolved: Resolved = mounted
    ? (preview?.resolved ?? resolvedTheme ?? "light")
    : "light";

  return (
    <>
      {typeof children === "function"
        ? children({ effective, resolved, toggleTheme })
        : children}
    </>
  );
}
