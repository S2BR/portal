"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export type PreviewRailItem = {
  /** The id of the element on the page this tick anchors to. */
  id: string;
  label: string;
  description?: string;
};

/**
 * The "hover pyramid": the hovered tick is full length, its neighbors taper off by index distance.
 */
export function scaleForDistance(distance: number): number {
  if (distance <= 0) {
    return 1;
  }
  if (distance === 1) {
    return 0.68;
  }
  if (distance === 2) {
    return 0.44;
  }
  return 0.25;
}

/** The tick's resting length when nothing is hovered. */
const RESTING_SCALE = 0.5;

/**
 * Tracks which of `ids` is the section currently in view (top-biased), for scroll-spy. Re-observes
 * whenever the set of ids changes.
 */
export function useActiveSection(ids: string[]): string | null {
  const key = ids.join("|");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sectionIds = key ? key.split("|") : [];
    // Re-seed the active section when the set of ids changes (e.g. a new tab's blocks).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive((previous) =>
      previous && sectionIds.includes(previous)
        ? previous
        : (sectionIds[0] ?? null),
    );
    if (sectionIds.length === 0) {
      return;
    }

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.add(entry.target.id);
          } else {
            visible.delete(entry.target.id);
          }
        }
        // The first section (in document order) that's currently in the viewport band.
        const current = sectionIds.find((id) => visible.has(id));
        if (current) {
          setActive(current);
        }
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: [0, 0.5, 1] },
    );

    for (const id of sectionIds) {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [key]);

  return active;
}

/**
 * A fixed rail of ticks on the right edge that mirrors a page's sections. Hovering a tick raises it
 * and its neighbors into a pyramid and shows a preview card to its left; the tick for the section in
 * view is tinted; clicking scrolls to it. A desktop affordance — hidden below `lg`.
 */
export function PreviewRail({
  items,
  className,
}: {
  items: PreviewRailItem[];
  className?: string;
}) {
  const reduce = useReducedMotion();
  const activeId = useActiveSection(items.map((item) => item.id));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return null;
  }

  const activeIndex = items.findIndex((item) => item.id === activeId);
  const previewItem = hoverIndex !== null ? items[hoverIndex] : null;

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <div
      className={cn(
        "fixed top-1/2 right-3 z-30 hidden -translate-y-1/2 items-center lg:flex",
        className,
      )}
    >
      <AnimatePresence>
        {previewItem ? (
          <motion.div
            key={previewItem.id}
            initial={reduce ? false : { opacity: 0, x: 8, filter: "blur(6px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, x: 8, filter: "blur(4px)" }
            }
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 32 }
            }
            className="bg-popover/80 text-popover-foreground ring-foreground/10 pointer-events-none absolute right-full mr-3 w-56 rounded-lg p-3 shadow-md ring-1 backdrop-blur-xl"
          >
            <p className="truncate text-sm font-medium">{previewItem.label}</p>
            {previewItem.description ? (
              <p className="text-muted-foreground mt-1 line-clamp-3 text-xs">
                {previewItem.description}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ul
        className="flex flex-col items-end gap-2"
        onMouseLeave={() => setHoverIndex(null)}
      >
        {items.map((item, index) => {
          const scaleX =
            hoverIndex === null
              ? RESTING_SCALE
              : scaleForDistance(Math.abs(index - hoverIndex));
          const isActive = index === activeIndex;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-label={item.label}
                aria-current={isActive ? "true" : undefined}
                onPointerEnter={() => setHoverIndex(index)}
                onFocus={() => setHoverIndex(index)}
                onBlur={() => setHoverIndex(null)}
                onClick={() => scrollTo(item.id)}
                className="focus-visible:ring-ring flex h-4 w-6 items-center justify-end rounded-sm outline-none focus-visible:ring-2"
              >
                <motion.span
                  aria-hidden
                  className={cn(
                    "block h-0.5 w-6 rounded-full",
                    isActive ? "bg-foreground" : "bg-muted-foreground/40",
                  )}
                  style={{ transformOrigin: "right center" }}
                  animate={{ scaleX }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 30 }
                  }
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
