"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Direction as RadixDirection } from "radix-ui";
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
 * Tracks which of `ids` is the section currently being read, for scroll-spy: the last section (in
 * document order) whose top has scrolled above a reading line just under the sticky header. This is
 * position-based rather than an IntersectionObserver band, so it works for thin targets (legal-page
 * headings) as well as tall ones (business form sections) — a clicked target that lands at its
 * `scroll-mt` offset is immediately the active one, instead of the band skipping past it.
 *
 * `offsetTop` is the reading line, matched to the sections' `scroll-mt` so a just-clicked heading
 * counts as active. Recomputes on scroll/resize and whenever the set of ids changes.
 */
export function useActiveSection(ids: string[], offsetTop = 100): string | null {
  const key = ids.join("|");
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const sectionIds = key ? key.split("|") : [];
    if (sectionIds.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActive(null);
      return;
    }

    const compute = () => {
      // At (or near) the bottom of the page the last section can't reach the reading line, so pin it
      // active — otherwise the tail sections are never selectable.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
      if (atBottom) {
        setActive(sectionIds[sectionIds.length - 1] ?? null);
        return;
      }

      let current = sectionIds[0] ?? null;
      for (const id of sectionIds) {
        const element = document.getElementById(id);
        if (!element) {
          continue;
        }
        if (element.getBoundingClientRect().top <= offsetTop) {
          current = id;
        } else {
          // Ids are in document order, so once one sits below the line the rest do too.
          break;
        }
      }
      setActive(current);
    };

    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [key, offsetTop]);

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
  const dir = RadixDirection.useDirection();
  const activeId = useActiveSection(items.map((item) => item.id));
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return null;
  }

  // The rail hugs the inline-end screen edge (right in LTR, left in RTL). Logical Tailwind classes
  // (end-*, me-*) handle the CSS mirroring; the two JS-side transforms below flip by hand.
  const enterX = dir === "rtl" ? -8 : 8;
  const barOrigin = dir === "rtl" ? "left center" : "right center";

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
        "fixed top-1/2 end-3 z-30 hidden -translate-y-1/2 items-center lg:flex",
        className,
      )}
    >
      <AnimatePresence>
        {previewItem ? (
          <motion.div
            key={previewItem.id}
            initial={
              reduce ? false : { opacity: 0, x: enterX, filter: "blur(6px)" }
            }
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, x: enterX, filter: "blur(4px)" }
            }
            transition={
              reduce
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 32 }
            }
            className="bg-popover/80 text-popover-foreground ring-foreground/10 pointer-events-none absolute end-full me-3 w-56 rounded-lg p-3 shadow-md ring-1 backdrop-blur-xl"
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
                  style={{ transformOrigin: barOrigin }}
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
