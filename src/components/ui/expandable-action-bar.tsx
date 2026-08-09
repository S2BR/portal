"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ActionBarItem = {
  id: string;
  label: string;
  icon: ReactNode;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  /** A subtle vs prominent look inside an inverted bar. */
  variant?: "solid" | "ghost";
  /** Tints the icon — `danger` red (delete), `success` green (save). */
  tone?: "default" | "danger" | "success";
};

/**
 * A pill of icon buttons that expands on hover/focus to reveal each button's label. The reveal is a
 * pure CSS grid-track width animation (0fr → 1fr) — no transform — so the pill only widens, it never
 * scales/"grows".
 *
 * `floating` docks it at the bottom-center of the screen, inverted (dark on light, light on dark),
 * and animates it in with a rise + a couple of radiating rings so people notice their save controls;
 * without it the pill renders inline for the caller to place. `align="end"` puts the label before the
 * icon so the pill widens to the left (for a right-aligned placement).
 */
export function ExpandableActionBar({
  items,
  open = true,
  floating = false,
  inverted = false,
  align = "start",
  className,
}: {
  items: ActionBarItem[];
  open?: boolean;
  floating?: boolean;
  inverted?: boolean;
  align?: "start" | "end";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [hovering, setHovering] = useState(false);
  // The bar opens with its labels showing, then collapses to icons after a beat (unless the pointer is
  // over it), so people first see what the actions are before it settles to a compact row of icons.
  const [autoOpen, setAutoOpen] = useState(false);
  const expanded = hovering || autoOpen;

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAutoOpen(false);
      return;
    }
    setAutoOpen(true);
    const timer = setTimeout(() => setAutoOpen(false), 1200);
    return () => clearTimeout(timer);
  }, [open]);

  const pill = (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
      className={cn(
        "flex items-center gap-1 rounded-full p-1.5 ring-1 backdrop-blur-xl",
        floating && "shadow-md",
        inverted ? "bg-foreground/95 ring-black/10" : "bg-card ring-border",
        !floating && className,
      )}
    >
      {items.map((item) => {
        const icon = (
          <span
            className={cn(
              "shrink-0 [&_svg]:size-4",
              item.tone === "danger" && "text-destructive",
              item.tone === "success" && "text-brand-green",
            )}
          >
            {item.icon}
          </span>
        );
        // Grid track goes 0fr → 1fr on expand — animates the real width, no scale transform.
        const label = (
          <span
            className={cn(
              "grid motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-out",
              expanded ? "grid-cols-[1fr]" : "grid-cols-[0fr]",
            )}
          >
            <span className="overflow-hidden">
              <span
                className={cn(
                  "block whitespace-nowrap motion-safe:transition-opacity motion-safe:duration-200",
                  align === "end" ? "pe-2" : "ps-2",
                  expanded ? "opacity-100" : "opacity-0",
                )}
              >
                {item.label}
              </span>
            </span>
          </span>
        );
        return (
          <button
            key={item.id}
            type={item.type ?? "button"}
            onClick={item.onClick}
            disabled={item.disabled}
            className={cn(
              "flex items-center rounded-full px-3 py-2 text-sm font-medium transition-colors outline-none disabled:pointer-events-none disabled:opacity-50",
              inverted
                ? item.variant === "ghost"
                  ? "text-background/80 hover:bg-background/10 hover:text-background focus-visible:bg-background/15"
                  : "text-background hover:bg-background/15 focus-visible:bg-background/15"
                : item.tone === "danger"
                  ? "text-destructive hover:bg-destructive/10 focus-visible:bg-destructive/10"
                  : "text-foreground hover:bg-muted focus-visible:bg-muted",
            )}
          >
            {align === "end" ? (
              <>
                {label}
                {icon}
              </>
            ) : (
              <>
                {icon}
                {label}
              </>
            )}
          </button>
        );
      })}
    </div>
  );

  if (!floating) {
    return pill;
  }

  return (
    <div
      className={cn(
        "fixed bottom-10 left-1/2 z-40 -translate-x-1/2",
        className,
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            key="action-bar"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 96 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 96 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    y: { type: "spring", stiffness: 380, damping: 30 },
                    opacity: { duration: 0.2 },
                  }
            }
          >
            <div className="relative">
              {/* Concentric hairline rings radiate out behind the pill — staggered so they read as a
                  ripple/pulse — drawing the eye to where actions get saved. Separate elements so the
                  pill itself never scales. */}
              {reduce
                ? null
                : [0, 1, 2].map((ring) => (
                    <motion.span
                      key={ring}
                      aria-hidden
                      className="border-foreground pointer-events-none absolute inset-0 -z-10 rounded-full border-[0.5px]"
                      initial={{ scale: 1, opacity: 0 }}
                      animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                      transition={{
                        delay: 0.3 + ring * 0.25,
                        duration: 0.85,
                        repeat: 2,
                        repeatDelay: 0.4,
                        ease: "easeOut",
                      }}
                    />
                  ))}
              {pill}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
