"use client";

import { Flag, ShieldCheck, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavKey = "reports";
type NavItem = { key: NavKey; href: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { key: "reports", href: "/portal/admin/reports", icon: Flag },
];

/**
 * The platform admin rail. Mirrors the business workspace sidebar's item styling. One section for
 * now (Reports / moderation queue); more admin surfaces hang off this as they're built.
 */
export function AdminSidebar() {
  const t = useTranslations("admin");
  const pathname = usePathname();

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
            {ITEMS.map((item) => {
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
