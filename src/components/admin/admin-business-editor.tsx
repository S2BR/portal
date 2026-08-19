"use client";

import {
  ArrowLeft,
  Eye,
  EyeOff,
  History,
  Lock,
  LockOpen,
  RotateCcw,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminAuditEntry,
  AdminAuditPage,
  AdminBusiness,
} from "@/app/api/admin/businesses/[id]/types";
import { AdminBusinessOwners } from "@/components/admin/admin-business-owners";
import { BusinessDetail } from "@/components/business/business-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type LifecycleAction = "lock" | "unlock" | "publish" | "unpublish" | "restore";

/**
 * The admin editor for one business: an operator header (state, owners, lifecycle overrides + audit)
 * over the reused owner edit form (pointed at the admin BFF, so it manages ANY business). The header
 * fetches the business for its state; the form fetches its own — a lifecycle action refetches the
 * header and remounts the form so both reflect the new state.
 */
export function AdminBusinessEditor({ id }: { id: string }) {
  const t = useTranslations("admin.businesses.editor");
  const statusT = useTranslations("admin.businesses.status");

  const [business, setBusiness] = useState<AdminBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [auditOpen, setAuditOpen] = useState(false);

  const loadHeader = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(id)}`,
      );
      if (response.status === 404) {
        setNotFound(true);
        return;
      }
      const data = (await response.json()) as { business?: AdminBusiness };
      if (data.business) {
        setBusiness(data.business);
      }
    } catch {
      // Leave the last-known header; the form surfaces its own load errors.
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Loads the header once on mount; setState runs after the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadHeader();
  }, [loadHeader]);

  async function runLifecycle(action: LifecycleAction) {
    setBusy(true);
    try {
      const response = await fetch(
        `/api/admin/businesses/${encodeURIComponent(id)}/lifecycle`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        },
      );
      if (!response.ok) {
        toast.error(t(response.status === 403 ? "forbidden" : "actionError"));
        return;
      }
      toast.success(t(`toast.${action}`));
      await loadHeader();
      // Remount the form so its data reflects the new lock/publish/deleted state.
      setFormKey((key) => key + 1);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (notFound || !business) {
    return (
      <div className="space-y-4">
        <BackLink label={t("back")} />
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("notFound")}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <BackLink label={t("back")} />

      {/* Operator header */}
      <div className="bg-card rounded-2xl border p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading truncate text-xl font-semibold">
                {business.name}
              </h1>
              <StatusBadge business={business} statusT={statusT} />
            </div>
            {business.is_locked && business.locked_reason ? (
              <p className="text-sm">
                <span className="text-muted-foreground">
                  {t("lockedReason")}:{" "}
                </span>
                {business.locked_reason}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAuditOpen(true)}
            >
              <History className="size-4" />
              {t("audit")}
            </Button>
            {business.is_deleted ? null : business.is_locked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runLifecycle("unlock")}
              >
                <LockOpen className="size-4" />
                {t("unlock")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runLifecycle("lock")}
              >
                <Lock className="size-4" />
                {t("lock")}
              </Button>
            )}
            {business.is_deleted ? null : business.is_published ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runLifecycle("unpublish")}
              >
                <EyeOff className="size-4" />
                {t("unpublish")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void runLifecycle("publish")}
              >
                <Eye className="size-4" />
                {t("publish")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {business.is_deleted ? (
        <div className="border-destructive/40 bg-destructive/5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-5">
          <p className="text-sm">{t("deletedBanner")}</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void runLifecycle("restore")}
          >
            <RotateCcw className="size-4" />
            {t("restore")}
          </Button>
        </div>
      ) : (
        <>
          <AdminBusinessOwners
            id={id}
            owners={business.owners}
            onChange={(owners) =>
              setBusiness((current) =>
                current ? { ...current, owners } : current,
              )
            }
          />
          {/* The reused owner edit form, pointed at the admin BFF — manages this business's detail. */}
          <BusinessDetail
            key={formKey}
            slug={id}
            basePath="/api/admin/businesses"
            deletedRedirect="/portal/admin/businesses"
          />
        </>
      )}

      <AuditSheet id={id} open={auditOpen} onOpenChange={setAuditOpen} t={t} />
    </div>
  );
}

function BackLink({ label }: { label: string }) {
  return (
    <Link
      href="/portal/admin/businesses"
      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" />
      {label}
    </Link>
  );
}

function StatusBadge({
  business,
  statusT,
}: {
  business: AdminBusiness;
  statusT: ReturnType<typeof useTranslations>;
}) {
  if (business.is_deleted) {
    return <Badge variant="red">{statusT("deleted")}</Badge>;
  }
  if (business.is_locked) {
    return <Badge variant="red">{statusT("locked")}</Badge>;
  }
  if (business.is_published) {
    return <Badge variant="green">{statusT("published")}</Badge>;
  }
  return <Badge variant="neutral">{statusT("draft")}</Badge>;
}

function AuditSheet({
  id,
  open,
  onOpenChange,
  t,
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const format = useFormatter();
  const [entries, setEntries] = useState<AdminAuditEntry[] | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    void (async () => {
      try {
        const response = await fetch(
          `/api/admin/businesses/${encodeURIComponent(id)}/audit`,
        );
        const data = (await response.json()) as AdminAuditPage;
        if (active) {
          setEntries(data.data);
        }
      } catch {
        if (active) {
          setEntries([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [open, id]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-1">
            <SheetTitle>{t("auditTitle")}</SheetTitle>
            <SheetDescription>{t("auditSubtitle")}</SheetDescription>
          </div>
          {entries === null ? (
            <div className="space-y-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("auditEmpty")}</p>
          ) : (
            <ol className="space-y-3">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-border/60 border-b pb-3 text-sm last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {t.has(`actions.${entry.action}`)
                        ? t(`actions.${entry.action}`)
                        : entry.action}
                    </span>
                    <span className="text-muted-foreground text-xs whitespace-nowrap">
                      {entry.created_at
                        ? format.dateTime(new Date(entry.created_at), {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {entry.actor.name ?? "—"}
                    {typeof entry.context?.reason === "string"
                      ? ` · ${entry.context.reason}`
                      : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
