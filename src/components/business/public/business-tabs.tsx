"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { BusinessLogo } from "@/components/business/business-logo";
import { cn } from "@/lib/utils";

/**
 * The persistent tab strip under the business header — Overview / Products / Reviews. Lives in the
 * business layout so it never remounts while navigating between the three; only the content below
 * swaps. Active state is derived from the current path (Overview is the exact base, the others match
 * their sub-path). Sticks below the site header as the content scrolls.
 *
 * Once the bar pins (the full hero has scrolled away), a compact identity wipes in on the left — the
 * logo first, then the name (revealed left-to-right as the block grows) — which shifts the tabs to the
 * right, so the business stays identified without the tall header.
 */
export function BusinessTabs({
  slug,
  name,
  logo,
}: {
  slug: string;
  name: string;
  logo: string | null;
}) {
  const t = useTranslations("businesses.public");
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  const base = `/businesses/${slug}`;

  // "Stuck" = the bar has reached its sticky offset (top-16 = 64px) under the site header. Measured
  // from the bar's own position each frame; that's exactly when the hero name has scrolled out of view.
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const nav = navRef.current;
      if (nav) {
        setStuck(nav.getBoundingClientRect().top <= 65);
      }
    };
    const onScroll = () => {
      if (!frame) {
        frame = requestAnimationFrame(measure);
      }
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const tabs = [
    { href: base, label: t("tabs.overview"), exact: true },
    { href: `${base}/products`, label: t("products"), exact: false },
    { href: `${base}/reviews`, label: t("reviews.title"), exact: false },
  ];

  return (
    <nav
      ref={navRef}
      className="bg-background/85 supports-[backdrop-filter]:bg-background/60 border-border/60 sticky top-16 z-[8] mt-4 border-b"
      // Explicit blur (both prefixes): Tailwind v4's `backdrop-blur` utility chains CSS vars that
      // Safari invalidates, dropping the blur. Matches the site header's 16px frost.
      style={{
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
      }}
    >
      {/* Full-width frosted bar (above); its content aligns to the same container as the page body. */}
      <div className="mx-auto flex w-full max-w-[90rem] items-center px-4 sm:px-6">
        {/* Compact identity — hidden until the bar sticks, then wipes open (logo, then name) and pushes
            the tabs right. `max-width` drives the reveal so the name simply truncates when there's no
            room; the name is desktop-only so the mobile bar keeps space for the tabs. */}
        <Link
          href={base}
          aria-hidden={!stuck}
          tabIndex={stuck ? undefined : -1}
          className={cn(
            "flex items-center gap-2 overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
            stuck
              ? "me-3 max-w-[55%] opacity-100"
              : "pointer-events-none me-0 max-w-0 opacity-0",
          )}
        >
          <BusinessLogo
            name={name}
            src={logo}
            className="bg-background size-7 shrink-0 rounded-lg"
            fallbackClassName="text-[10px]"
          />
          <span className="hidden truncate text-sm font-semibold sm:inline">
            {name}
          </span>
        </Link>

        <div className="flex gap-1">
          {tabs.map((tab) => {
            const active = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative px-3 py-3.5 text-sm font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {active ? (
                  <span className="bg-primary absolute inset-x-3 -bottom-px h-0.5 rounded-full" />
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
