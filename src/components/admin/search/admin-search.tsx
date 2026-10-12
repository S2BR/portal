"use client";

import { AlertTriangle, Database, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type {
  SearchCollectionStatus,
  SearchStatus,
} from "@/app/api/admin/search/status/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServiceUnavailable } from "@/components/ui/service-unavailable";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

type CollectionKey = "businesses" | "products" | "categories" | "amenities";

/**
 * Admin "Search index" page: live Typesense status (reachability, version, indexed-vs-database counts per
 * collection) and a manual re-sync — per collection or all at once, optionally a full rebuild. Status
 * polls every 30s; re-syncing is queued server-side, so counts catch up as the worker runs.
 */
export function AdminSearch() {
  const t = useTranslations("admin.search");
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [rebuild, setRebuild] = useState(false);
  // Which target is being queued ("all" or a collection key), for the button spinners.
  const [syncing, setSyncing] = useState<string | null>(null);
  // A full rebuild is held here pending confirmation (it briefly empties the index).
  const [pending, setPending] = useState<"all" | CollectionKey | null>(null);
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/search/status");
      if (response.status === 403) {
        setFailed(true);
        toast.error(t("forbidden"));
        return;
      }
      if (!response.ok) {
        setFailed(true);
        if (loadedOnce.current) {
          toast.error(t("loadError"));
        }
        return;
      }
      setStatus((await response.json()) as SearchStatus);
      setFailed(false);
      loadedOnce.current = true;
    } catch {
      setFailed(true);
    }
  }, [t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const resync = useCallback(
    async (collection: "all" | CollectionKey) => {
      setSyncing(collection);
      try {
        const response = await fetch("/api/admin/search/reindex", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ collection, rebuild }),
        });
        if (!response.ok) {
          toast.error(t("resync.error"));
          return;
        }
        toast.success(t("resync.queued"));
        // Give the worker a moment, then refresh the counts.
        setTimeout(() => void load(), 1_500);
      } catch {
        toast.error(t("resync.error"));
      } finally {
        setSyncing(null);
      }
    },
    [rebuild, load, t],
  );

  // A full rebuild briefly empties the index, so confirm it first; a plain re-sync runs immediately.
  const requestResync = useCallback(
    (target: "all" | CollectionKey) => {
      if (rebuild) {
        setPending(target);
        return;
      }
      void resync(target);
    },
    [rebuild, resync],
  );

  const healthy = Boolean(status?.healthy && status?.configured);

  if (failed && !status) {
    return (
      <div className="space-y-8">
        <Header t={t} />
        <ServiceUnavailable onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Header t={t} />

      <ServerCard
        status={status}
        rebuild={rebuild}
        onRebuildChange={setRebuild}
        syncing={syncing}
        onResyncAll={() => requestResync("all")}
        onRefresh={() => void load()}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {status
          ? status.collections.map((collection) => (
              <CollectionCard
                key={collection.key}
                collection={collection}
                healthy={healthy}
                busy={syncing === collection.key || syncing === "all"}
                onResync={() => requestResync(collection.key as CollectionKey)}
              />
            ))
          : Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-36 rounded-xl" />
            ))}
      </div>

      <p className="text-muted-foreground text-sm">{t("workerNote")}</p>

      <Dialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("confirm.title")}</DialogTitle>
            <DialogDescription>{t("confirm.body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              {t("confirm.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const target = pending;
                setPending(null);
                if (target) {
                  void resync(target);
                }
              }}
            >
              {t("confirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Header({ t }: { t: (key: string) => string }) {
  return (
    <header>
      <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
    </header>
  );
}

function ServerCard({
  status,
  rebuild,
  onRebuildChange,
  syncing,
  onResyncAll,
  onRefresh,
}: {
  status: SearchStatus | null;
  rebuild: boolean;
  onRebuildChange: (value: boolean) => void;
  syncing: string | null;
  onResyncAll: () => void;
  onRefresh: () => void;
}) {
  const t = useTranslations("admin.search");

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CardTitle>{t("server.title")}</CardTitle>
            {status ? <StatusBadge status={status} /> : null}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={!status}
          >
            <RefreshCw className="size-4" />
            {t("refresh")}
          </Button>
        </div>
        <CardDescription className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <span>
            {t("server.host")}:{" "}
            <span className="text-foreground font-medium">
              {status?.host || t("server.unknown")}
            </span>
          </span>
          <span>
            {t("server.version")}:{" "}
            <span className="text-foreground font-medium">
              {status?.version || t("server.unknown")}
            </span>
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status?.resources ? (
          <div className="grid grid-cols-3 gap-4 border-b pb-4">
            <ResourceStat
              label={t("resources.memory")}
              value={`${formatBytes(status.resources.memory_used_bytes)} / ${formatBytes(status.resources.memory_total_bytes)}`}
            />
            <ResourceStat
              label={t("resources.disk")}
              value={`${formatBytes(status.resources.disk_used_bytes)} / ${formatBytes(status.resources.disk_total_bytes)}`}
            />
            <ResourceStat
              label={t("resources.cpu")}
              value={`${Math.round(status.resources.cpu_active_percentage)}%`}
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex items-center gap-2">
            <Switch
              checked={rebuild}
              onCheckedChange={onRebuildChange}
              disabled={syncing !== null}
            />
            <span className="text-sm">
              <span className="font-medium">{t("resync.rebuild")}</span>
              <span className="text-muted-foreground block text-xs">
                {t("resync.rebuildHint")}
              </span>
            </span>
          </label>
          <Button onClick={onResyncAll} disabled={syncing !== null}>
            {syncing === "all" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            {t("resync.all")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ResourceStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm font-medium tabular-nums">{value}</div>
      <div className="text-muted-foreground text-xs">{label}</div>
    </div>
  );
}

/** Human-readable bytes (B/KB/MB/GB/TB), e.g. 1536 → "1.5 KB". */
function formatBytes(bytes: number): string {
  if (!bytes) {
    return "—";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function StatusBadge({ status }: { status: SearchStatus }) {
  const t = useTranslations("admin.search");

  if (!status.configured) {
    return <Badge variant="neutral">{t("server.notConfigured")}</Badge>;
  }
  if (status.healthy) {
    return <Badge variant="green">{t("server.healthy")}</Badge>;
  }
  return <Badge variant="red">{t("server.down")}</Badge>;
}

function CollectionCard({
  collection,
  healthy,
  busy,
  onResync,
}: {
  collection: SearchCollectionStatus;
  /** Whether Typesense is reachable — only then can we judge a collection out of sync. */
  healthy: boolean;
  busy: boolean;
  onResync: () => void;
}) {
  const t = useTranslations("admin.search");
  const locale = useLocale();
  const label = labelFor(collection.key, t);

  // Only flag when we can actually see the index: the collection is missing, or it exists but holds
  // nothing while the database has rows. Small nonzero gaps are normal (only searchable rows index), so
  // they're deliberately not flagged.
  const outOfSync =
    healthy &&
    (!collection.exists ||
      (collection.indexed === 0 && collection.database_total > 0));

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Database className="text-muted-foreground size-4" />
            {label}
          </CardTitle>
          <div className="flex items-center gap-2">
            {outOfSync ? (
              <Badge variant="red">
                <AlertTriangle className="size-3" />
                {t("collection.needsResync")}
              </Badge>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={onResync}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              {t("resync.one")}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div
              className={cn(
                "text-2xl font-semibold tabular-nums",
                !collection.exists && "text-muted-foreground",
              )}
            >
              {collection.indexed ?? "—"}
            </div>
            <div className="text-muted-foreground text-xs">
              {collection.exists ? t("metrics.indexed") : t("metrics.missing")}
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-medium tabular-nums">
              {collection.database_total}
            </div>
            <div className="text-muted-foreground text-xs">
              {t("metrics.database")}
            </div>
          </div>
        </div>
        <div className="text-muted-foreground border-t pt-2 text-xs">
          {t("collection.lastSynced")}:{" "}
          {collection.last_reindexed_at
            ? relativeTime(collection.last_reindexed_at, locale)
            : t("collection.never")}
        </div>
      </CardContent>
    </Card>
  );
}

/** A compact localized "x ago" for an ISO timestamp. */
function relativeTime(iso: string, locale: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(seconds) >= secs || unit === "second") {
      return rtf.format(-Math.round(seconds / secs), unit);
    }
  }
  return rtf.format(0, "second");
}

function labelFor(key: string, t: (key: string) => string): string {
  const known: Record<string, string> = {
    businesses: t("collections.businesses"),
    products: t("collections.products"),
    categories: t("collections.categories"),
    amenities: t("collections.amenities"),
  };
  return known[key] ?? key;
}
