"use client";

import {
  ExternalLink,
  EyeOff,
  Eye,
  Lock,
  LockOpen,
  ShieldAlert,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminReport,
  AdminReportsPage,
} from "@/app/api/admin/reports/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

const STATUSES = ["open", "reviewing", "resolved", "dismissed"] as const;
const REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "sexual_content",
  "child_sexual_abuse",
  "illegal",
  "misinformation",
  "impersonation",
  "privacy",
  "other",
] as const;
const TYPES = ["business", "review"] as const;
const ALL = "all";

type BadgeVariant = "neutral" | "green" | "gold" | "red" | "outline";
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  open: "green",
  reviewing: "gold",
  resolved: "neutral",
  dismissed: "outline",
};

/**
 * The operator moderation queue: reported resources (priority reasons first, then newest),
 * filterable by status, reason, and target type. A row opens a detail panel with the full report,
 * the complete reported resource, any resolution note, and the actions (hide/lock the target,
 * resolve/dismiss the report). The API enforces the super_admin role.
 */
export function ReportsQueue() {
  const t = useTranslations("admin");
  const reasonT = useTranslations("moderation.reasons");
  const format = useFormatter();

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>(ALL);
  const [reason, setReason] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminReport | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (status !== ALL) query.set("status", status);
    if (reason !== ALL) query.set("reason", reason);
    if (type !== ALL) query.set("type", type);
    if (page > 1) query.set("page", String(page));
    try {
      const response = await fetch(`/api/admin/reports?${query.toString()}`);
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as AdminReportsPage;
      setReports(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [status, reason, type, page, t]);

  useEffect(() => {
    // Refetch on mount and whenever a filter/page changes; setState runs after the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function onFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  const formatDate = (value: string | null) =>
    value
      ? format.dateTime(new Date(value), {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("reports.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("reports.subtitle")}
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label={t("filters.status")}
          value={status}
          onChange={(value) => onFilter(setStatus, value)}
          allLabel={t("filters.allStatuses")}
          options={STATUSES.map((key) => ({
            value: key,
            label: t(`status.${key}`),
          }))}
        />
        <FilterSelect
          label={t("filters.reason")}
          value={reason}
          onChange={(value) => onFilter(setReason, value)}
          allLabel={t("filters.allReasons")}
          options={REASONS.map((key) => ({ value: key, label: reasonT(key) }))}
        />
        <FilterSelect
          label={t("filters.type")}
          value={type}
          onChange={(value) => onFilter(setType, value)}
          allLabel={t("filters.allTypes")}
          options={TYPES.map((key) => ({
            value: key,
            label: t(`targets.${key}`),
          }))}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("reports.empty")}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.target")}</TableHead>
                <TableHead>{t("table.reason")}</TableHead>
                <TableHead>{t("table.reporter")}</TableHead>
                <TableHead>{t("table.reported")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow
                  key={report.id}
                  onClick={() => setSelected(report)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <TargetCell
                      report={report}
                      unknownLabel={t("targets.deleted")}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      {report.is_priority ? (
                        <ShieldAlert
                          className="size-4 shrink-0 text-red-600 dark:text-red-400"
                          aria-label={t("priority")}
                        />
                      ) : null}
                      {reasonT(report.reason)}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.reporter.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(report.created_at)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[report.status] ?? "neutral"}>
                      {t(`status.${report.status}`)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {meta.last_page > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t("pagination.page", {
              page: meta.current_page,
              total: meta.last_page,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || meta.current_page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || meta.current_page >= meta.last_page}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("pagination.next")}
            </Button>
          </div>
        </div>
      ) : null}

      <ReportDetail
        key={selected?.id ?? "none"}
        report={selected}
        t={t}
        reasonT={reasonT}
        formatDate={formatDate}
        onClose={() => setSelected(null)}
        onActioned={async () => {
          setSelected(null);
          await load();
        }}
      />
    </div>
  );
}

/** The reported resource in the table: label (CSS-truncated) + context, a link for a business. */
function TargetCell({
  report,
  unknownLabel,
}: {
  report: AdminReport;
  unknownLabel: string;
}) {
  const target = report.target;
  if (!target) {
    return <span className="text-muted-foreground italic">{unknownLabel}</span>;
  }
  return (
    <span className="block min-w-0">
      <span className="block max-w-xs truncate font-medium">
        {target.label}
      </span>
      {target.context ? (
        <span className="text-muted-foreground block max-w-xs truncate text-xs">
          {target.context}
        </span>
      ) : null}
    </span>
  );
}

/**
 * The report detail panel — everything about one report, plus the actions. Hide/unhide or lock/unlock
 * the target (whichever it is) and resolve/dismiss the report; the note applies to whatever action is
 * taken. Closing on any successful action reloads the list.
 */
function ReportDetail({
  report,
  t,
  reasonT,
  formatDate,
  onClose,
  onActioned,
}: {
  report: AdminReport | null;
  t: ReturnType<typeof useTranslations>;
  reasonT: ReturnType<typeof useTranslations>;
  formatDate: (value: string | null) => string;
  onClose: () => void;
  onActioned: () => Promise<void>;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (report === null) {
    return null;
  }
  const target = report.target;

  async function moderate(action: "hide" | "unhide" | "lock" | "unlock") {
    setBusy(true);
    const response = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target: target?.type,
        id: target?.id,
        action,
        reason: note.trim() || null,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "actionError"));
      return;
    }
    toast.success(t(`toast.${action}`));
    await onActioned();
  }

  async function close(action: "resolve" | "dismiss") {
    setBusy(true);
    const response = await fetch(
      `/api/admin/reports/${encodeURIComponent(report!.id)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note.trim() || null }),
      },
    );
    setBusy(false);
    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "actionError"));
      return;
    }
    toast.success(t(`toast.${action}`));
    await onActioned();
  }

  return (
    <Sheet open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {report.is_priority ? (
                <Badge variant="red" className="gap-1">
                  <ShieldAlert className="size-3.5" aria-hidden />
                  {t("priority")}
                </Badge>
              ) : null}
              <Badge variant={STATUS_VARIANT[report.status] ?? "neutral"}>
                {t(`status.${report.status}`)}
              </Badge>
            </div>
            <SheetTitle className="text-xl">
              {reasonT(report.reason)}
            </SheetTitle>
            <SheetDescription>
              {t("detail.reporterLabel")}: {report.reporter.name ?? "—"} ·{" "}
              {formatDate(report.created_at)}
            </SheetDescription>
          </div>

          {/* Reporter's free-text message */}
          <Section title={t("detail.reporterMessage")}>
            {report.details ? (
              <p className="text-sm whitespace-pre-wrap">{report.details}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {t("detail.noMessage")}
              </p>
            )}
          </Section>

          {/* The reported resource, in full */}
          <Section title={t("detail.reportedResource")}>
            {target ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{t(`targets.${target.type}`)}</Badge>
                  {target.context ? (
                    <span className="text-muted-foreground text-sm">
                      {target.context}
                    </span>
                  ) : null}
                </div>
                <div className="bg-muted/40 rounded-lg border p-3 text-sm whitespace-pre-wrap">
                  {target.label}
                </div>
                {target.type === "business" ? (
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/businesses/${encodeURIComponent(target.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      {t("detail.viewPublic")}
                    </Link>
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                {t("targets.deleted")}
              </p>
            )}
          </Section>

          {/* Resolution, once closed */}
          {report.status === "resolved" || report.status === "dismissed" ? (
            <Section title={t("detail.resolution")}>
              <p className="text-muted-foreground mb-1 text-xs">
                {t("detail.resolvedAt")}: {formatDate(report.resolved_at)}
              </p>
              {report.resolution_note ? (
                <p className="text-sm whitespace-pre-wrap">
                  {report.resolution_note}
                </p>
              ) : (
                <p className="text-muted-foreground text-sm italic">
                  {t("detail.noResolutionNote")}
                </p>
              )}
            </Section>
          ) : null}

          {/* Actions */}
          <div className="space-y-3 border-t pt-5">
            <div className="space-y-1.5">
              <label htmlFor="detail-note" className="text-sm font-medium">
                {t("detail.noteLabel")}
              </label>
              <Textarea
                id="detail-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t("confirm.notePlaceholder")}
                rows={3}
              />
            </div>

            {target?.type === "review" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void moderate("hide")}
                >
                  <EyeOff className="size-4" />
                  {t("actions.hide")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void moderate("unhide")}
                >
                  <Eye className="size-4" />
                  {t("actions.unhide")}
                </Button>
              </div>
            ) : null}

            {target?.type === "business" ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busy}
                  onClick={() => void moderate("lock")}
                >
                  <Lock className="size-4" />
                  {t("actions.lock")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void moderate("unlock")}
                >
                  <LockOpen className="size-4" />
                  {t("actions.unlock")}
                </Button>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={busy}
                onClick={() => void close("resolve")}
              >
                {t("actions.resolve")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => void close("dismiss")}
              >
                {t("actions.dismiss")}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allLabel: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-muted-foreground text-xs font-medium">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
