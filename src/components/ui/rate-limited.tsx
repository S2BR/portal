"use client";

import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { toast } from "sonner";

import { useCooldown } from "@/lib/use-cooldown";
import { cn } from "@/lib/utils";

/**
 * The inline "you're rate limited" panel for a page-load surface: a live countdown of the wait, and
 * — via {@link useCooldown} — an automatic `onRetry()` when it elapses, so content reappears without
 * the user doing anything. Replaces a silent empty state (the dead screen the user hit).
 */
export function RateLimited({
  retryAfter,
  onRetry,
  className,
}: {
  retryAfter: number;
  onRetry?: () => void;
  className?: string;
}) {
  const t = useTranslations("rateLimit");
  const remaining = useCooldown(retryAfter, onRetry);

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
        <Clock className="size-6" />
      </span>
      <p className="font-medium">{t("title")}</p>
      <p className="text-muted-foreground max-w-sm text-sm">
        {remaining > 0 ? t("body", { seconds: remaining }) : t("retrying")}
      </p>
    </div>
  );
}

/**
 * The toast body — a live countdown for a one-off action that got rate limited. It can't call
 * `useTranslations` (the Toaster mounts outside the intl provider), so the labels are passed in
 * already localized: `title` and a `countdown(seconds)` formatter.
 */
function RateLimitToastBody({
  retryAfter,
  title,
  countdown,
  ready,
}: {
  retryAfter: number;
  title: string;
  countdown: (seconds: number) => string;
  ready: string;
}) {
  const remaining = useCooldown(retryAfter);
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground text-sm">
        {remaining > 0 ? countdown(remaining) : ready}
      </span>
    </div>
  );
}

/**
 * Show a rate-limit toast with a live countdown for a one-off action (save, reorder, delete). The
 * caller passes already-localized labels since the toast renders outside the intl provider.
 */
export function rateLimitToast(
  retryAfter: number,
  labels: { title: string; countdown: (seconds: number) => string; ready: string },
): void {
  toast.error(
    <RateLimitToastBody
      retryAfter={retryAfter}
      title={labels.title}
      countdown={labels.countdown}
      ready={labels.ready}
    />,
    { duration: Math.max(retryAfter, 1) * 1000 },
  );
}

/**
 * A ready-to-call rate-limit toast bound to the current locale — `const notify = useRateLimitToast();
 * notify(retryAfter)`. Wraps {@link rateLimitToast} with the localized labels so callers (which run
 * inside the intl provider) don't have to thread them through.
 */
export function useRateLimitToast(): (retryAfter: number) => void {
  const t = useTranslations("rateLimit");
  return useCallback(
    (retryAfter: number) => {
      rateLimitToast(retryAfter, {
        title: t("title"),
        countdown: (seconds) => t("actionCountdown", { seconds }),
        ready: t("ready"),
      });
    },
    [t],
  );
}
