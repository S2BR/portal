"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "@/app/api/auth/sessions/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNow } from "@/lib/use-now";

/**
 * List the account's active sessions (one per device / login lineage) and let
 * the user sign a device out individually or everywhere else. The caller's own
 * session is flagged and cannot be revoked from here.
 */
export function SessionSettings() {
  const t = useTranslations("sessions");
  const format = useFormatter();
  // Ticks every 30s (paused while the tab is hidden) so "last active …" updates live.
  const now = useNow();

  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setPending(family);
    setError(null);
    try {
      const response = await fetch(
        `/api/auth/sessions/${encodeURIComponent(family)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      await load();
    } catch {
      setError(t("error"));
    } finally {
      setPending(null);
    }
  }

  async function revokeOthers() {
    setPending("others");
    setError(null);
    try {
      const response = await fetch("/api/auth/sessions", { method: "DELETE" });
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      await load();
    } catch {
      setError(t("error"));
    } finally {
      setPending(null);
    }
  }

  const hasOthers = (sessions ?? []).some((session) => !session.current);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sessions === null ? (
          <div
            className="bg-muted h-16 w-full animate-pulse rounded-lg"
            aria-hidden
          />
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : (
          <ul className="divide-border divide-y">
            {sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">
                      {session.device_name ?? t("unknownDevice")}
                    </span>
                    {session.current ? (
                      <Badge variant="green">{t("current")}</Badge>
                    ) : null}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {session.ip_address ?? t("unknownIp")}
                    {session.last_used_at
                      ? ` · ${t("lastActive", {
                          when: format.relativeTime(
                            new Date(session.last_used_at),
                            now,
                          ),
                        })}`
                      : ""}
                  </p>
                </div>
                {session.current ? null : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pending !== null}
                    onClick={() => revoke(session.id)}
                  >
                    {t("signOut")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
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
      </CardContent>
    </Card>
  );
}
