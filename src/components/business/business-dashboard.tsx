"use client";

import {
  Eye,
  Heart,
  Info,
  LineChart,
  Package,
  Star,
  TrendingUp,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/** Decorative bar heights (%) for the placeholder chart — fixed, so it renders identically each time. */
const CHART_BARS = [
  38, 52, 44, 61, 49, 72, 58, 66, 47, 79, 63, 71, 55, 84, 68, 76,
];

/** The insight metrics previewed on the dashboard (data lands in a later release). */
const STATS: { key: "views" | "favorites" | "reviews" | "rating"; icon: LucideIcon }[] =
  [
    { key: "views", icon: Eye },
    { key: "favorites", icon: Heart },
    { key: "reviews", icon: Star },
    { key: "rating", icon: TrendingUp },
  ];

const LINKS: { key: "information" | "products" | "services"; icon: LucideIcon }[] =
  [
    { key: "information", icon: Info },
    { key: "products", icon: Package },
    { key: "services", icon: Wrench },
  ];

/**
 * The company workspace home — a designed overview of the insights coming to the dashboard (profile
 * views, favorites, reviews, a trend chart), clearly marked "coming soon", above the real quick-links
 * into the company's areas. Matches the account dashboard's language: a neutral gradient hero,
 * muted tiles, and the gold "soon" badge (never a green wash).
 */
export function BusinessDashboard({ slug }: { slug: string }) {
  const t = useTranslations("businesses.workspace");
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/businesses/${encodeURIComponent(slug)}`,
        );
        const data = (await response.json()) as { business?: Business };
        if (active) {
          setBusiness(data.business ?? null);
        }
      } catch {
        // The information page surfaces a real load/not-found error; the overview stays quiet.
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const base = `/portal/businesses/${slug}`;
  const soon = t("dashboard.soon");
  const name = business?.name ?? "";
  const soonBadge = (
    <Badge variant="gold" className="text-[10px] uppercase">
      {soon}
    </Badge>
  );

  return (
    <div className="space-y-8">
      {/* Header — plain logo + name + subtitle, no backdrop. */}
      <section className="flex items-center gap-4">
        {loading ? (
          <Skeleton className="size-16 shrink-0 rounded-xl" />
        ) : (
          <UserAvatar
            name={name}
            src={business?.logo}
            className="size-16 rounded-xl"
            fallbackClassName="text-xl"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            {loading ? <Skeleton className="h-8 w-48" /> : name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </section>

      {/* Insights banner — the coming-soon pattern (muted tile + gold badge), like ModuleCard. */}
      <div className="bg-muted/40 flex items-start gap-4 rounded-xl p-5">
        <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
          <LineChart className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{t("dashboard.insights.title")}</h3>
            {soonBadge}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {t("dashboard.insights.body", {
              name: name || t("dashboard.yourCompany"),
            })}
          </p>
        </div>
      </div>

      {/* KPI stat cards (previews) — StatTile layout, value replaced by the soon badge. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.key}
            className="bg-muted/40 flex h-full items-center gap-3 rounded-xl p-4"
          >
            <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
              <stat.icon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">
                {t(`dashboard.stats.${stat.key}`)}
              </p>
              <div className="mt-1">{soonBadge}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend chart (preview) — neutral placeholder bars + gold badge. */}
      <div className="bg-muted/40 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{t("dashboard.chart.title")}</p>
            <p className="text-muted-foreground text-sm">
              {t("dashboard.chart.period")}
            </p>
          </div>
          {soonBadge}
        </div>
        <div className="mt-6 flex h-40 items-end gap-1.5 sm:gap-2" aria-hidden>
          {CHART_BARS.map((height, index) => (
            <div
              key={index}
              className="from-muted-foreground/15 to-muted-foreground/5 flex-1 rounded-t-md bg-gradient-to-t"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      {/* Manage — real quick links. */}
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium">
          {t("groups.manage")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={`${base}/${link.key}`}
              className="focus-visible:ring-ring group rounded-xl outline-none focus-visible:ring-2"
            >
              <div className="bg-muted/40 hover:bg-muted/70 flex h-full items-center gap-3 rounded-xl p-4 transition-colors">
                <span className="bg-muted text-muted-foreground group-hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg transition-colors">
                  <link.icon className="size-5" aria-hidden />
                </span>
                <p className="min-w-0 truncate font-medium">
                  {t(`nav.${link.key}`)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
