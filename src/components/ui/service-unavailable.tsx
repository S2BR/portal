"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import { useCooldown } from "@/lib/use-cooldown";
import { cn } from "@/lib/utils";

/**
 * The auto-retry backoff, in seconds: 10s, 40s, 1m, 2m30s, 3m, 5m, 10m, 20m, 30m, 45m, 1h, 2h — 12
 * attempts over ~5h, after which the user retries manually (which restarts the whole cycle).
 */
export const BACKOFF_SECONDS = [
  10, 40, 60, 150, 180, 300, 600, 1200, 1800, 2700, 3600, 7200,
];

/** Compact human duration: 10 → "10s", 150 → "2m 30s", 3600 → "1h", 7200 → "2h". */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  return parts.join(" ");
}

/**
 * The "the service is unavailable, hang tight" state for a surface whose data couldn't load because
 * the API is down (a 5xx, a network error — NOT a 404 or a 429, which have their own states). It
 * retries `onRetry` behind the scenes on a **decaying** schedule ({@link BACKOFF_SECONDS}), showing
 * the attempt number and a live countdown to the next try — so the page heals itself over ~5h without
 * the user watching it. When the schedule is exhausted, a manual "Try again" retries now and restarts
 * the cycle. The parent must keep this mounted while the error persists (so the attempt count holds);
 * a successful `onRetry` unmounts it.
 */
export function ServiceUnavailable({
  onRetry,
  className,
}: {
  onRetry: () => void;
  className?: string;
}) {
  const t = useTranslations("serviceUnavailable");
  const [attempt, setAttempt] = useState(0);
  const exhausted = attempt >= BACKOFF_SECONDS.length;

  // On each elapse: move to the next (longer) step and fire a retry. If it fails, the parent keeps us
  // mounted, so `attempt` persists and the next, longer wait begins; if it succeeds, we unmount.
  const advance = useCallback(() => {
    setAttempt((value) => value + 1);
    onRetry();
  }, [onRetry]);

  const remaining = useCooldown(
    exhausted ? 0 : BACKOFF_SECONDS[attempt]!,
    exhausted ? undefined : advance,
  );

  const retryNow = useCallback(() => {
    setAttempt(0); // a manual retry restarts the whole backoff cycle
    onRetry();
  }, [onRetry]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-col items-center gap-3 py-16 text-center",
        className,
      )}
    >
      <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
        <ServerCrash className="size-6" />
      </span>
      <p className="font-medium">{t("title")}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{t("body")}</p>
      {exhausted ? (
        <Button variant="outline" size="sm" onClick={retryNow}>
          <RefreshCw className="size-4" />
          {t("retry")}
        </Button>
      ) : (
        <p className="text-muted-foreground text-xs">
          {t("attempt", {
            current: attempt + 1,
            total: BACKOFF_SECONDS.length,
          })}
          {" · "}
          {t("retryingIn", { when: formatDuration(remaining) })}
        </p>
      )}
    </div>
  );
}
