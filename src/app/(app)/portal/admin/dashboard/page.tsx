import {
  Building2,
  ImageIcon,
  LayoutGrid,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { Card } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("admin.dashboard");
  return { title: t("title") };
}

type Shortcut = { key: string; href: string; icon: LucideIcon };

// The admin areas surfaced as entry cards. Order mirrors the sidebar (Businesses, Catalog,
// Moderation, Uploads); each new admin surface slots in here as it's built.
const SHORTCUTS: Shortcut[] = [
  { key: "businesses", href: "/portal/admin/businesses", icon: Building2 },
  { key: "catalog", href: "/portal/admin/products", icon: LayoutGrid },
  { key: "moderation", href: "/portal/admin/reports", icon: ShieldCheck },
  { key: "uploads", href: "/portal/admin/uploads", icon: ImageIcon },
];

/**
 * The admin landing page — a lightweight overview that opens the panel and routes to each admin area.
 * It intentionally holds no live data yet; metrics widgets slot in here as their endpoints land.
 */
export default async function AdminDashboardPage() {
  const t = await getTranslations("admin.dashboard");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SHORTCUTS.map(({ key, href, icon: Icon }) => (
          <Link key={key} href={href} className="group block">
            <Card className="hover:border-brand-green/40 h-full gap-3 p-5 transition-colors">
              <div className="flex items-center gap-3">
                <span className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <span className="font-medium">
                  {t(`shortcuts.${key}.label`)}
                </span>
              </div>
              <p className="text-muted-foreground text-sm">
                {t(`shortcuts.${key}.description`)}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
