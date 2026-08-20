"use client";

import {
  BadgeCheck,
  Building2,
  Flag,
  ImageIcon,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useCurrentUser } from "@/components/auth/current-user";

import { cn } from "@/lib/utils";

type NavKey = "reports" | "claims" | "businesses" | "uploads";
// requiredRoles gates a section to specific admin roles (community admins, moderators, …). Empty =
// visible to anyone who can open the panel. Only Reports exists today, so nothing is gated yet.
type NavItem = {
  key: NavKey;
  href: string;
  icon: LucideIcon;
  requiredRoles?: string[];
};

const ITEMS: NavItem[] = [
  { key: "reports", href: "/portal/admin/reports", icon: Flag },
  { key: "claims", href: "/portal/admin/claims", icon: BadgeCheck },
  { key: "businesses", href: "/portal/admin/businesses", icon: Building2 },
  { key: "uploads", href: "/portal/admin/uploads", icon: ImageIcon },
];

/**
 * The platform admin rail. Mirrors the business workspace sidebar's item styling. One section for
 * now (Reports / moderation queue); more admin surfaces hang off this as they're built.
 */
export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const roles = user?.roles ?? [];
  const items = ITEMS.filter(
    (item) =>
      !item.requiredRoles ||
      item.requiredRoles.some((role) => roles.includes(role)),
  );

  return (
    <aside className="px-4 pt-6 sm:w-72 sm:shrink-0 sm:px-6 sm:pt-10">
      <div className="space-y-8 sm:sticky sm:top-24">
        <div className="flex items-center gap-2 px-3">
          <ShieldCheck
            className="text-brand-green size-5 shrink-0"
            aria-hidden
          />
          <span className="font-semibold">{t("title")}</span>
        </div>
        <nav className="text-sm">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-3 py-2 transition-colors",
                      active
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <item.icon className="size-4 shrink-0" aria-hidden />
                    <span className="truncate">{t(`nav.${item.key}`)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
