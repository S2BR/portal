"use client";

import { MonitorSmartphone } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Session, SessionLocation } from "@/app/api/auth/sessions/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingTile } from "@/components/ui/setting-tile";
import { Skeleton } from "@/components/ui/skeleton";
import { regionName } from "@/lib/format-address";
import { useNow } from "@/lib/use-now";

/**
 * "City, Region, Country" for a session's origin — the country code localized to a name (e.g.
 * `BR` → "Brasil"), region shown as its code (e.g. `SP`). Null when nothing could be resolved.
 */
function formatLocation(
  location: SessionLocation | null,
  locale: string,
): string | null {
  if (!location) {
    return null;
  }
  const country = location.country
    ? regionName(location.country, locale)
    : null;
  const parts = [location.city, location.region, country].filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * List the account's active sessions (one per device / login lineage) and let
 * the user sign a device out individually or everywhere else. The caller's own
 * session is flagged and cannot be revoked from here.
 */
export function SessionSettings() {
  const t = useTranslations("sessions");
  const format = useFormatter();
  const locale = useLocale();
  // Ticks every 30s (paused while the tab is hidden) so "last active …" updates live.
  const now = useNow();

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/sessions");
      const data = (await response.json()) as { sessions?: Session[] };
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    // One-off fetch on mount; setState only runs after the async response
    // resolves, which this lint rule cannot see through.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function revoke(family: string) {
    const snapshot = sessions;
    setPending(family);
    // Optimistic: drop the row now; roll back if the request fails.
    setSessions(
      (prev) => prev?.filter((session) => session.id !== family) ?? prev,
    );
    try {
      const response = await fetch(
        `/api/auth/sessions/${encodeURIComponent(family)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setSessions(snapshot);
        toast.error(t("error"));
        return;
      }
      toast.success(t("revoked"));
    } catch {
      setSessions(snapshot);
      toast.error(t("error"));
    } finally {
      setPending(null);
    }
  }

  async function revokeOthers() {
    const snapshot = sessions;
    setPending("others");
    // Optimistic: keep only the current session.
    setSessions((prev) => prev?.filter((session) => session.current) ?? prev);
    try {
      const response = await fetch("/api/auth/sessions", { method: "DELETE" });
      if (!response.ok) {
        setSessions(snapshot);
        toast.error(t("error"));
        return;
      }
      toast.success(t("revokedOthers"));
    } catch {
      setSessions(snapshot);
      toast.error(t("error"));
    } finally {
      setPending(null);
    }
  }

  const hasOthers = (sessions ?? []).some((session) => !session.current);

  return (
    <div className="space-y-3">
      {sessions === null ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : sessions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((session) => {
            const place = formatLocation(session.location, locale);
            const lastActive = session.last_used_at
              ? t("lastActive", {
                  when: format.relativeTime(
                    new Date(session.last_used_at),
                    now,
                  ),
                })
              : null;
            // Primary line is "where" (falling back to the IP, then "unknown"); the IP moves to the
            // secondary line only when it isn't already the primary, alongside "last active".
            const primary = place ?? session.ip_address ?? t("unknownIp");
            const details = [
              place && session.ip_address ? session.ip_address : null,
              lastActive,
            ].filter(Boolean);

            return (
              <SettingTile
                key={session.id}
                icon={MonitorSmartphone}
                subtitle={
                  <>
                    <span className="block truncate">{primary}</span>
                    {details.length > 0 ? (
                      <span className="block truncate opacity-80">
                        {details.join(" · ")}
                      </span>
                    ) : null}
                  </>
                }
                action={
                  session.current ? (
                    <Badge variant="green">{t("current")}</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pending !== null}
                      onClick={() => revoke(session.id)}
                    >
                      {t("signOut")}
                    </Button>
                  )
                }
              >
                {session.device_name ?? t("unknownDevice")}
              </SettingTile>
            );
          })}
        </div>
      )}
      {hasOthers ? (
        <Button
          variant="destructive"
          size="sm"
          disabled={pending !== null}
          onClick={revokeOthers}
        >
          {t("signOutOthers")}
        </Button>
      ) : null}
    </div>
  );
}
