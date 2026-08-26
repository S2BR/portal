"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/** A leaf navigation entry (a page). */
export type SidebarLeaf = {
  key: string;
  label: string;
  href: string;
  icon?: LucideIcon;
};

/** A group of pages. A single-item group navigates directly; a multi-item one reveals a second rail. */
export type SidebarGroup = {
  key: string;
  label: string;
  icon: LucideIcon;
  items: SidebarLeaf[];
};

/**
 * A two-level sidebar (a group rail + a contextual second rail), modeled on the portal--6 Filament
 * clusters: the primary rail lists groups, and selecting a multi-item group reveals a second rail
 * beside it with that group's pages. Single-item groups navigate straight to their page (no second
 * rail). The active group/page is derived from the current route, so deep links land correctly.
 *
 * Presentational + generic (labels are passed in already-translated), so the admin area — and later
 * the business workspace or other portals — can each supply their own groups and reuse this shell.
 */
export function SectionedSidebar({
  title,
  titleIcon: TitleIcon,
  groups,
  pathname: pathnameProp,
}: {
  title: string;
  titleIcon?: LucideIcon;
  groups: SidebarGroup[];
  /** Override the current path (for tests/previews); defaults to the live route. */
  pathname?: string;
}) {
  const routePathname = usePathname();
  const pathname = pathnameProp ?? routePathname;

  const isActiveLeaf = (leaf: SidebarLeaf): boolean =>
    pathname === leaf.href || pathname.startsWith(`${leaf.href}/`);

  const activeGroup = groups.find((group) => group.items.some(isActiveLeaf));
  const activeLeaf = activeGroup?.items.find(isActiveLeaf);
  const secondary =
    activeGroup && activeGroup.items.length > 1 ? activeGroup : null;

  // Selecting a group enters its active page when it's the current group, else its first page.
  const groupHref = (group: SidebarGroup): string =>
    group.key === activeGroup?.key && activeLeaf
      ? activeLeaf.href
      : (group.items[0]?.href ?? "#");

  return (
    <aside className="px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="flex gap-2 sm:sticky sm:top-24">
        <div className="min-w-0 flex-1 sm:w-48 sm:flex-none sm:shrink-0">
          <div className="mb-6 flex items-center gap-2 px-3">
            {TitleIcon ? (
              <TitleIcon className="text-brand-green size-5 shrink-0" aria-hidden />
            ) : null}
            <span className="font-semibold">{title}</span>
          </div>
          <nav className="text-sm">
            <ul className="space-y-1">
              {groups.map((group) => {
                const active = group.key === activeGroup?.key;
                // A single-page group reads as that page (no second rail); a multi-page group reads as
                // the group and reveals its pages beside it.
                const single = group.items.length === 1 ? group.items[0] : null;
                const Icon = single?.icon ?? group.icon;
                return (
                  <li key={group.key}>
                    <Link
                      href={single ? single.href : groupHref(group)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
                        active
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">
                        {single ? single.label : group.label}
                      </span>
                      {single ? null : (
                        <ChevronRight
                          className={cn(
                            "size-4 shrink-0 transition-transform",
                            active && "rotate-90",
                          )}
                          aria-hidden
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {secondary ? (
          <div className="border-border min-w-0 flex-1 border-l pl-2 sm:w-48 sm:flex-none sm:shrink-0">
            <div className="mb-6 flex items-center gap-2 px-3 pt-0.5">
              <secondary.icon
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              <span className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {secondary.label}
              </span>
            </div>
            <nav className="text-sm">
              <ul className="space-y-1">
                {secondary.items.map((leaf) => {
                  const active = isActiveLeaf(leaf);
                  return (
                    <li key={leaf.key}>
                      <Link
                        href={leaf.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
                          active
                            ? "bg-muted text-foreground font-medium"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {leaf.icon ? (
                          <leaf.icon className="size-4 shrink-0" aria-hidden />
                        ) : null}
                        <span className="truncate">{leaf.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
