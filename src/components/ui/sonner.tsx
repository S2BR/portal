"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Auto-dismiss duration shared by the toast timer AND the timeout bar (exposed to CSS as
 * `--toast-duration`), so the slim bar reaches its end exactly as the toast dismisses. See the
 * "Toast timeout bar" rules in globals.css.
 */
const TOAST_DURATION = 4000;

/** App toaster, themed from next-themes. Mount once near the root. */
function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      richColors
      duration={TOAST_DURATION}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--toast-duration": `${TOAST_DURATION}ms`,
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
