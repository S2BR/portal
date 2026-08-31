"use client";

import { Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { MyPoints } from "@/app/api/me/points/route";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * The signed-in user's points summary — score, current tier, and a bar toward the next tier. Shown on
 * the profile. Reads {@see MyPoints} from the BFF; degrades quietly if it can't load.
 */
export function PointsSummary() {
  const t = useTranslations("points");
  const [data, setData] = useState<MyPoints | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/me/points");
        if (response.ok && active) {
          setData((await response.json()) as MyPoints);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return <Skeleton className="h-24 w-full rounded-xl" />;
  }
  if (data === null) {
    return null;
  }

  // Fraction filled within the current tier band (current tier min → next tier min).
  const floor = data.tier?.min_points ?? 0;
  const ceiling = data.next_tier?.min_points ?? null;
  const progress =
    ceiling !== null && ceiling > floor
      ? Math.min(
          100,
          Math.max(0, ((data.points - floor) / (ceiling - floor)) * 100),
        )
      : 100;

  return (
    <div className="bg-muted/40 space-y-3 rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="bg-background text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
            <Trophy className="size-5" aria-hidden />
          </span>
          <div>
            <span className="text-muted-foreground block text-xs">
              {t("title")}
            </span>
            <span className="font-heading text-xl font-semibold tabular-nums">
              {t("score", { points: data.points })}
            </span>
          </div>
        </div>
        {data.tier ? (
          <Badge variant="neutral">{data.tier.name}</Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{t("start")}</span>
        )}
      </div>

      {data.next_tier ? (
        <div className="space-y-1.5">
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-brand-green h-full rounded-full transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {t("toNext", {
              points: data.points_to_next ?? 0,
              tier: data.next_tier.name,
            })}
          </p>
        </div>
      ) : data.tier ? (
        <p className="text-muted-foreground text-xs">{t("topTier")}</p>
      ) : null}
    </div>
  );
}
