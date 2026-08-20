"use client";

import { Download, ImageIcon, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminUpload,
  AdminUploadsPage,
} from "@/app/api/admin/uploads/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TYPES = [
  "avatar",
  "business-logo",
  "business-banner",
  "business-gallery",
  "claim-proof",
] as const;
const STATUSES = ["pending", "confirmed"] as const;
const ALL = "all";

type BadgeVariant = "neutral" | "green" | "gold" | "red" | "outline";
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  confirmed: "green",
  pending: "gold",
};

/**
 * A byte count as a compact human label with one decimal (e.g. "99.2 KB", "1.4 MB"), or an em dash
 * when unknown. The single decimal is kept so per-row sizes visibly add up to the total widget.
 */
function formatBytes(bytes: number | null): string {
  if (bytes === null) {
    return "—";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

/**
 * The operator upload manager: every direct-to-S3 upload in the ledger, newest first, filterable by
 * type and status. Each row shows a preview, the bound resource, size/mime, uploader, and status;
 * an orphan (or anything unwanted) can be deleted, which purges the S3 object(s) and the row. The API
 * enforces the super_admin role.
 */
export function UploadsManager() {
  const t = useTranslations("admin.uploads");
  const format = useFormatter();

  const [uploads, setUploads] = useState<AdminUpload[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState({ count: 0, size: 0 });
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState<string>(ALL);
  const [status, setStatus] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [pendingDelete, setPendingDelete] = useState<AdminUpload | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = new URLSearchParams();
    if (type !== ALL) query.set("type", type);
    if (status !== ALL) query.set("status", status);
    if (page > 1) query.set("page", String(page));
    try {
      const response = await fetch(`/api/admin/uploads?${query.toString()}`);
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as AdminUploadsPage;
      setUploads(data.data);
      setMeta(data.meta);
      setSummary(data.summary);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [type, status, page, t]);

  useEffect(() => {
    // Refetch on mount and whenever a filter/page changes; setState runs after the async response.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function onFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  async function confirmDelete() {
    if (!pendingDelete) {
      return;
    }
    setDeleting(true);
    const response = await fetch(
      `/api/admin/uploads/${encodeURIComponent(pendingDelete.id)}`,
      { method: "DELETE" },
    );
    setDeleting(false);
    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "actionError"));
      return;
    }
    toast.success(t("toast.deleted"));
    setPendingDelete(null);
    await load();
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

  const typeLabel = (key: string) =>
    (TYPES as readonly string[]).includes(key) ? t(`type.${key}`) : key;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      {/* Totals for the active filter set (updates as the filters change). */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <StatCard
          label={t("widgets.files")}
          value={format.number(summary.count)}
          loading={loading}
        />
        <StatCard
          label={t("widgets.totalSize")}
          value={formatBytes(summary.size)}
          loading={loading}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <FilterSelect
          label={t("filters.type")}
          value={type}
          onChange={(value) => onFilter(setType, value)}
          allLabel={t("filters.allTypes")}
          options={TYPES.map((key) => ({ value: key, label: t(`type.${key}`) }))}
        />
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
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : uploads.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.preview")}</TableHead>
                <TableHead>{t("table.type")}</TableHead>
                <TableHead>{t("table.boundTo")}</TableHead>
                <TableHead>{t("table.size")}</TableHead>
                <TableHead>{t("table.uploader")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.uploaded")}</TableHead>
                <TableHead className="text-end">{t("table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.map((upload) => (
                <TableRow key={upload.id}>
                  <TableCell>
                    <Preview upload={upload} alt={t("previewAlt")} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {typeLabel(upload.type)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {upload.bound ? (
                      <span className="block max-w-[16rem] truncate">
                        {upload.bound.label ?? upload.bound.type}
                        <span className="text-muted-foreground/70">
                          {" · "}
                          {upload.bound.type}
                        </span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                    {formatBytes(upload.size)}
                    {upload.mime ? (
                      <span className="text-muted-foreground/70 block text-xs">
                        {upload.mime}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="block max-w-[10rem] truncate">
                      {upload.uploader.name ?? "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[upload.status] ?? "neutral"}>
                      {t(`status.${upload.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {formatDate(upload.created_at)}
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon"
                        aria-label={t("actions.download")}
                      >
                        <a
                          href={upload.download}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="size-4" />
                        </a>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={t("actions.delete")}
                        onClick={() => setPendingDelete(upload)}
                      >
                        <Trash2 className="text-destructive size-4" />
                      </Button>
                    </div>
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

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("delete.title")}</DialogTitle>
            <DialogDescription>{t("delete.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                {t("delete.cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {t("delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** A small image thumbnail for an upload, or a neutral placeholder tile. */
function Preview({ upload, alt }: { upload: AdminUpload; alt: string }) {
  if (upload.preview) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
      <img
        src={upload.preview}
        alt={alt}
        className="bg-muted size-10 rounded-md border object-cover"
      />
    );
  }
  return (
    <div
      className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-md border"
      aria-hidden
    >
      <ImageIcon className="size-4" />
    </div>
  );
}

/** A compact summary tile — a label over a large value (a skeleton while the list is loading). */
function StatCard({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <div className="bg-muted/40 rounded-xl border p-4">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1.5 h-7 w-20" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      )}
    </div>
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
