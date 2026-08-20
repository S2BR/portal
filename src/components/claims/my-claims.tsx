"use client";

import { Building2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { MyClaim } from "@/app/api/claims/route";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type BadgeVariant = "neutral" | "green" | "gold" | "red";

/** Status → badge tone, matching the operator claims queue. */
const STATUS_VARIANT: Record<MyClaim["status"], BadgeVariant> = {
  pending: "gold",
  approved: "green",
  auto_approved: "green",
  rejected: "red",
};

/**
 * The signed-in user's own ownership claims, newest first — each showing its target and where it
 * stands. Reads from the claims BFF; degrades to an empty state on any hiccup (the BFF returns an
 * empty list rather than erroring).
 */
export function MyClaims() {
  const t = useTranslations("myClaims");
  const format = useFormatter();
  const [claims, setClaims] = useState<MyClaim[] | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/claims");
        const data = (await response.json()) as { data?: MyClaim[] };
        if (active) {
          setClaims(data.data ?? []);
        }
      } catch {
        if (active) {
          setClaims([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (claims === null) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-[76px] w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
        {t("empty")}
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {claims.map((claim) => (
        <li
          key={claim.id}
          className="bg-card flex items-center gap-4 rounded-2xl border p-4"
        >
          <span className="bg-muted text-muted-foreground flex size-11 shrink-0 items-center justify-center rounded-lg">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{claim.target.label}</p>
            <p className="text-muted-foreground text-xs">
              {t.has(`type.${claim.target.type}`)
                ? t(`type.${claim.target.type}`)
                : claim.target.type}
              {claim.created_at
                ? ` · ${format.dateTime(new Date(claim.created_at), { dateStyle: "medium" })}`
                : ""}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[claim.status] ?? "neutral"}>
            {t(`status.${claim.status}`)}
          </Badge>
        </li>
      ))}
    </ul>
  );
}
