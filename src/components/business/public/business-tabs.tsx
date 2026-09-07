"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * The persistent tab strip under the business header — Overview / Products / Reviews. Lives in the
 * business layout so it never remounts while navigating between the three; only the content below
 * swaps. Active state is derived from the current path (Overview is the exact base, the others match
 * their sub-path). Sticks to the top of the viewport as the content scrolls.
 */
export function BusinessTabs({ slug }: { slug: string }) {
  const t = useTranslations("businesses.public");
  const pathname = usePathname();
  const base = `/businesses/${slug}`;

  const tabs = [
    { href: base, label: t("tabs.overview"), exact: true },
    { href: `${base}/products`, label: t("products"), exact: false },
    { href: `${base}/reviews`, label: t("reviews.title"), exact: false },
  ];

  return (
    <nav className="bg-background/85 supports-[backdrop-filter]:bg-background/70 border-border/60 sticky top-16 z-20 -mx-4 mt-4 flex gap-1 border-b px-4 backdrop-blur sm:-mx-6 sm:px-6">
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
    </nav>
  );
}
