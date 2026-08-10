"use client";

import { Info, Package, Wrench, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useEffect, useState } from "react";

import type { Business } from "@/app/api/businesses/route";
import { UserAvatar } from "@/components/auth/user-avatar";
import { Skeleton } from "@/components/ui/skeleton";

/** The business home — a light overview with quick links into the business's areas. */
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
  const tiles: {
    key: "information" | "products" | "services";
    icon: LucideIcon;
  }[] = [
    { key: "information", icon: Info },
    { key: "products", icon: Package },
    { key: "services", icon: Wrench },
  ];

  return (
    <div className="space-y-8">
      <section className="flex items-center gap-4">
        {loading ? (
          <Skeleton className="size-14 rounded-xl" />
        ) : (
          <UserAvatar
            name={business?.name ?? ""}
            src={business?.logo}
            className="size-14 rounded-xl"
            fallbackClassName="text-2xl"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-heading truncate text-2xl font-semibold tracking-tight">
            {business?.name ?? <Skeleton className="h-7 w-40" />}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link
            key={tile.key}
            href={`${base}/${tile.key}`}
            className="focus-visible:ring-ring group rounded-xl outline-none focus-visible:ring-2"
          >
            <div className="bg-muted/40 hover:bg-muted/70 flex h-full items-center gap-3 rounded-xl p-4 transition-colors">
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                <tile.icon className="size-5" aria-hidden />
              </span>
              <p className="min-w-0 truncate font-medium">
                {t(`nav.${tile.key}`)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
