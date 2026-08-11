"use client";

import {
  ChevronsUpDown,
  Info,
  LayoutDashboard,
  Package,
  Plus,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { UserAvatar } from "@/components/auth/user-avatar";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useBusinessIdentity } from "@/components/business/business-identity-context";
import { useBusinessNav } from "@/components/business/business-nav-context";
import { parseRateLimit } from "@/lib/rate-limit";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "information" | "products" | "services";
type NavItem = { key: NavKey; href: string; icon: LucideIcon; exact?: boolean };

/**
 * The business-scoped rail shown while viewing a business (`/portal/businesses/[slug]/*`). Mirrors the
 * Filament business (tenant) panel: a business switcher + "create business" at the top, then a
 * Dashboard and two grouped sections. Lives inside the app shell's centered content, and — because
 * it's rendered by the `[slug]` layout — stays mounted (no refetch/reload) as you move between the
 * business's pages.
 */
export function BusinessSidebar({ slug }: { slug: string }) {
  const t = useTranslations("businesses.workspace");
  const pathname = usePathname();
  const router = useRouter();
  const nav = useBusinessNav();
  const identity = useBusinessIdentity();
  const setNavPresent = nav?.setPresent;
  const setNavOpen = nav?.setOpen;
  // Prefer optimistic overrides (a live rename or a just-uploaded logo from the business page) over
  // what this sidebar fetched, so changes show here instantly instead of after a reload.
  const displayName = (business: Business) =>
    identity?.overrides[business.slug]?.name ?? business.name;
  const displayLogo = (business: Business) => {
    const override = identity?.overrides[business.slug];
    // Distinguish "no override" (undefined → keep fetched logo) from "logo removed" (null).
    return override && "logo" in override ? override.logo : business.logo;
  };
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [businesses, setBusinesses] = useState<Business[] | null>(null);

  // Tell the header a business sidebar is mounted (so it shows the mobile toggle) and tidy up on
  // unmount. The setters are stable, so this runs once per mount.
  useEffect(() => {
    setNavPresent?.(true);
    return () => {
      setNavPresent?.(false);
      setNavOpen?.(false);
    };
  }, [setNavPresent, setNavOpen]);

  // Close the mobile drawer whenever navigation happens (e.g. tapping a nav item).
  useEffect(() => {
    setNavOpen?.(false);
  }, [pathname, setNavOpen]);

  const loadRef = useRef<() => void>(() => {});
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = (await response.json()) as {
        businesses?: Business[];
        status?: string;
        retry_after?: number | null;
      };
      const limit = parseRateLimit(response.status, data);
      if (limit) {
        // Don't collapse the switcher to "no businesses" on a throttle — the detail/list surfaces
        // already tell the user; here we just self-heal once the wait passes.
        setTimeout(() => loadRef.current(), limit.retryAfter * 1000);
        return;
      }
      setBusinesses(data.businesses ?? []);
    } catch {
      setBusinesses([]);
    }
  }, []);

  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    // One-off fetch on mount; setState runs only after the async response resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const base = `/portal/businesses/${slug}`;
  const current =
    businesses?.find((business) => business.slug === slug) ?? null;

  const dashboard: NavItem = {
    key: "dashboard",
    href: base,
    icon: LayoutDashboard,
    exact: true,
  };
  const manage: NavItem[] = [
    { key: "information", href: `${base}/information`, icon: Info },
  ];
  const offerings: NavItem[] = [
    { key: "products", href: `${base}/products`, icon: Package },
    { key: "services", href: `${base}/services`, icon: Wrench },
  ];

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const renderItem = (item: NavItem) => (
    <li key={item.key}>
      <Link
        href={item.href}
        aria-current={isActive(item) ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
          isActive(item)
            ? "bg-muted text-foreground font-medium"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <item.icon className="size-4 shrink-0" aria-hidden />
        <span className="truncate">{t(`nav.${item.key}`)}</span>
      </Link>
    </li>
  );

  const navContent = (
    <div className="space-y-10">
      {/* Business switcher — searchable, so a long list stays easy to navigate. `modal` lets its
          portalled panel work while inside the mobile drawer (a Dialog), matching the Combobox. */}
      <Popover open={switcherOpen} onOpenChange={setSwitcherOpen} modal>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="hover:bg-muted/60 focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg p-2 text-start outline-none focus-visible:ring-2"
          >
            {current ? (
              <UserAvatar
                name={displayName(current)}
                src={displayLogo(current)}
                className="size-8 rounded-md"
                fallbackClassName="rounded-md text-sm"
              />
            ) : (
              <Skeleton className="size-8 shrink-0 rounded-md" />
            )}
            <span className="min-w-0 flex-1 truncate font-medium">
              {current ? displayName(current) : <Skeleton className="h-4 w-24" />}
            </span>
            <ChevronsUpDown
              className="text-muted-foreground size-4 shrink-0"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) min-w-64 p-0"
        >
          <Command>
            {/* Only worth a search box once there's more than one business to sift through. */}
            {(businesses?.length ?? 0) > 1 ? (
              <CommandInput placeholder={t("searchPlaceholder")} />
            ) : null}
            <CommandList>
              <CommandEmpty>{t("noResults")}</CommandEmpty>
              {(businesses ?? []).map((business) => (
                <CommandItem
                  key={business.slug}
                  // cmdk keys selection/highlight off `value`; use the unique slug so two businesses
                  // that share a name don't collapse into one highlighted item. The name goes to
                  // `keywords` so search still matches it.
                  value={business.slug}
                  keywords={[displayName(business)]}
                  onSelect={() => {
                    setSwitcherOpen(false);
                    router.push(`/portal/businesses/${business.slug}`);
                  }}
                >
                  <UserAvatar
                    name={displayName(business)}
                    src={displayLogo(business)}
                    className="size-5 rounded"
                    fallbackClassName="rounded text-[9px]"
                  />
                  <span className="truncate">{displayName(business)}</span>
                  {business.slug === slug ? (
                    <span
                      className="bg-brand-green ms-auto size-2 shrink-0 rounded-full"
                      aria-hidden
                    />
                  ) : null}
                </CommandItem>
              ))}
            </CommandList>
            <div className="border-border/60 border-t p-1">
              <Link
                href="/portal/businesses/new"
                onClick={() => setSwitcherOpen(false)}
                className="hover:bg-accent hover:text-accent-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-sm"
              >
                <Plus className="size-4" aria-hidden />
                {t("create")}
              </Link>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Navigation */}
      <nav className="space-y-10 text-sm">
        <ul className="space-y-1">{renderItem(dashboard)}</ul>
        <NavGroup label={t("groups.manage")}>{manage.map(renderItem)}</NavGroup>
        <NavGroup label={t("groups.offerings")}>
          {offerings.map(renderItem)}
        </NavGroup>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop: a persistent left column. */}
      <aside className="hidden px-4 pt-6 sm:block sm:w-80 sm:shrink-0 sm:px-6 sm:pt-10">
        <div className="sm:sticky sm:top-24">{navContent}</div>
      </aside>
      {/* Mobile: a drawer opened from the header's hamburger. */}
      <Sheet
        open={nav?.open ?? false}
        onOpenChange={(value) => setNavOpen?.(value)}
      >
        {/* Extra top padding so the switcher clears the sheet's close button. */}
        <SheetContent side="left" className="pt-14">
          <SheetTitle className="sr-only">{t("menuTitle")}</SheetTitle>
          {navContent}
        </SheetContent>
      </Sheet>
    </>
  );
}

/** A labeled group of sidebar links (an uppercase section heading + its items). */
function NavGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground px-3 text-xs font-medium tracking-wider uppercase">
        {label}
      </p>
      <ul className="space-y-1">{children}</ul>
    </div>
  );
}
