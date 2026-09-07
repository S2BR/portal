"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** One jump target — an anchor id (matching a section heading) and its label. */
export interface CatalogNavItem {
  id: string;
  name: string;
}

/**
 * A sticky "jump to a section" bar for the full products catalog — one chip per section, so a customer
 * taps straight to what they want instead of scrolling the whole list. Highlights the section currently
 * in view (scroll-spy) and keeps the active chip scrolled into view on mobile. Sticks just below the
 * business tab strip.
 */
export function CatalogSectionNav({
  items,
  label,
}: {
  items: CatalogNavItem[];
  label: string;
}) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const navRef = useRef<HTMLElement>(null);
  const chipRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  // Scroll-spy: the section whose heading sits nearest the top (just under the two sticky bars) wins.
  useEffect(() => {
    const targets = items
      .map((item) => document.getElementById(`catalog-${item.id}`))
      .filter((element): element is HTMLElement => element !== null);
    if (targets.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id) {
          setActiveId(id.replace(/^catalog-/, ""));
        }
      },
      // Bias the "active" line down past the sticky tabs + this nav (~144px). rootMargin only takes
      // px or % — never rem/other units, or the IntersectionObserver constructor throws.
      { rootMargin: "-144px 0px -60% 0px", threshold: 0 },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [items]);

  // Keep the active chip visible as the spy moves through the sections. Scroll only the nav's OWN
  // horizontal track (never `scrollIntoView`, which would also scroll the window and cancel an
  // in-flight jump — Chrome runs one smooth scroll at a time).
  useEffect(() => {
    const nav = navRef.current;
    const chip = chipRefs.current[activeId];
    if (!nav || !chip) {
      return;
    }
    const target = chip.offsetLeft - nav.clientWidth / 2 + chip.clientWidth / 2;
    nav.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [activeId]);

  if (items.length < 2) {
    return null;
  }

  const jumpTo = (id: string) => (event: React.MouseEvent) => {
    event.preventDefault();
    document
      .getElementById(`catalog-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActiveId(id);
  };

  return (
    <nav
      ref={navRef}
      aria-label={label}
      className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-12 z-10 -mx-4 mb-6 flex [scrollbar-width:none] gap-2 overflow-x-auto border-b px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <a
            key={item.id}
            ref={(node) => {
              chipRefs.current[item.id] = node;
            }}
            href={`#catalog-${item.id}`}
            onClick={jumpTo(item.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active
                ? "bg-primary text-primary-foreground border-transparent"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.name}
          </a>
        );
      })}
    </nav>
  );
}
