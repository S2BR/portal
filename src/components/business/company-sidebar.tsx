"use client";

import {
  Check,
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
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { UserAvatar } from "@/components/auth/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type NavKey = "dashboard" | "information" | "products" | "services";
type NavItem = { key: NavKey; href: string; icon: LucideIcon; exact?: boolean };

/**
 * The company-scoped rail shown while viewing a company (`/portal/businesses/[slug]/*`). Mirrors the
 * Filament business (tenant) panel: a company switcher + "create company" at the top, then a
 * Dashboard and two grouped sections. Lives inside the app shell's centered content, and — because
 * it's rendered by the `[slug]` layout — stays mounted (no refetch/reload) as you move between the
 * company's pages.
 */
export function CompanySidebar({ slug }: { slug: string }) {
  const t = useTranslations("businesses.company");
  const pathname = usePathname();
  const [businesses, setBusinesses] = useState<Business[] | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/businesses");
      const data = (await response.json()) as { businesses?: Business[] };
      setBusinesses(data.businesses ?? []);
    } catch {
      setBusinesses([]);
    }
  }, []);

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

  return (
    <aside className="sm:w-56 sm:shrink-0">
      <div className="space-y-10 sm:sticky sm:top-20">
        {/* Company switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="border-input hover:bg-muted/50 focus-visible:ring-ring flex w-full items-center gap-2 rounded-lg border p-2 text-start outline-none focus-visible:ring-2"
            >
              {current ? (
                <UserAvatar
                  name={current.name}
                  src={current.logo}
                  className="size-8 rounded-md"
                />
              ) : (
                <Skeleton className="size-8 shrink-0 rounded-md" />
              )}
              <span className="min-w-0 flex-1 truncate font-medium">
                {current?.name ?? <Skeleton className="h-4 w-24" />}
              </span>
              <ChevronsUpDown
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
          >
            <DropdownMenuLabel>{t("switch")}</DropdownMenuLabel>
            {(businesses ?? []).map((business) => (
              <DropdownMenuItem key={business.slug} asChild>
                <Link href={`/portal/businesses/${business.slug}`}>
                  <UserAvatar
                    name={business.name}
                    src={business.logo}
                    className="size-5 rounded"
                  />
                  <span className="truncate">{business.name}</span>
                  {business.slug === slug ? (
                    <Check className="ms-auto size-4" aria-hidden />
                  ) : null}
                </Link>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/portal/businesses/new">
                <Plus className="size-4" aria-hidden />
                {t("create")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Navigation */}
        <nav className="space-y-10 text-sm">
          <ul className="space-y-1">{renderItem(dashboard)}</ul>
          <NavGroup label={t("groups.manage")}>
            {manage.map(renderItem)}
          </NavGroup>
          <NavGroup label={t("groups.offerings")}>
            {offerings.map(renderItem)}
          </NavGroup>
        </nav>
      </div>
    </aside>
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
