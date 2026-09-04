"use client";

import {
  Calendar,
  CircleDot,
  Download,
  FileType,
  HardDrive,
  ImageIcon,
  Tag,
  Trash2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminUpload,
  AdminUploadsPage,
} from "@/app/api/admin/uploads/route";
import {
  Filters,
  type FilterField,
  type FilterValue,
  type FiltersLabels,
} from "@/components/ui/filters";
import { paramsToPills, pillsToParams } from "@/lib/filters/pill";
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
  "product-image",
  "product-variant-image",
] as const;
const STATUSES = ["pending", "confirmed"] as const;

type BadgeVariant = "neutral" | "green" | "gold" | "red" | "outline";
const STATUS_VARIANT: Record<string, BadgeVariant> = {
  confirmed: "green",
  pending: "gold",
};

/** A byte count as a compact human label with one decimal (e.g. "99.2 KB"), or an em dash. */
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
 * The operator upload manager. Every direct-to-S3 upload in the ledger, filtered SERVER-SIDE via the
 * shared pill {@see Filters} bar → the same `filter[…]` contract the API expects. The query is mirrored
 * into the URL (history.replaceState), so the view is shareable + refresh-safe. Rows show a preview,
 * bound resource, size/mime, uploader, and status; each can
 * be downloaded or deleted (which purges the S3 object[s] + row). The API enforces the super_admin role.
 */
export function UploadsManager() {
  const t = useTranslations("admin.uploads");
  const tf = useTranslations("filters");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [uploads, setUploads] = useState<AdminUpload[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState({ count: 0, size: 0 });
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<AdminUpload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page"));
    return Number.isInteger(raw) && raw > 1 ? raw : 1;
  });

  // The pill filter bar — every field is a `filter[…]` column (no top-level scopes here).
  const filterFields: FilterField[] = [
    {
      id: "type",
      label: t("filters.type"),
      icon: Tag,
      type: "multiselect",
      options: TYPES.map((key) => ({ value: key, label: t(`type.${key}`) })),
      operators: [{ id: "is_any_of" }, { id: "is_none_of" }],
    },
    {
      id: "status",
      label: t("filters.status"),
      icon: CircleDot,
      type: "multiselect",
      options: STATUSES.map((key) => ({
        value: key,
        label: t(`status.${key}`),
      })),
      operators: [{ id: "is_any_of" }, { id: "is_none_of" }],
    },
    {
      id: "size",
      label: t("filters.size"),
      icon: HardDrive,
      type: "number",
      operators: [
        { id: "gt" },
        { id: "lt" },
        { id: "eq" },
        { id: "between", shape: "range" },
      ],
    },
    {
      id: "mime",
      label: t("filters.mime"),
      icon: FileType,
      type: "text",
      operators: [{ id: "contains" }, { id: "is" }, { id: "starts_with" }],
    },
    {
      id: "created_at",
      label: t("filters.uploaded"),
      icon: Calendar,
      type: "date",
      operators: [
        { id: "eq" },
        { id: "lt" },
        { id: "gt" },
        { id: "between", shape: "range" },
      ],
    },
  ];

  const filterLabels: FiltersLabels = {
    addFilter: tf("addFilter"),
    clearAll: tf("clearAll"),
    search: tf("search"),
    noResults: tf("noResults"),
    min: tf("from"),
    max: tf("to"),
    operators: tf.raw("operators") as Record<string, string>,
  };

  const [filterValues, setFilterValues] = useState<FilterValue[]>(() =>
    paramsToPills(new URLSearchParams(searchParams.toString()), filterFields),
  );

  // The query the filters + page describe: the refetch keys off it, and it's mirrored into the address
  // bar via history.replaceState (no navigation, so the filter fields never lose focus mid-type).
  const params = pillsToParams(filterValues, filterFields);
  if (page > 1) {
    params.set("page", String(page));
  }
  const queryString = params.toString();

  const applyFilters = (values: FilterValue[]) => {
    setFilterValues(values);
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/uploads?${queryString}`);
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
  }, [queryString, t]);

  useEffect(() => {
    // Debounced so typing a text filter fires one request, not one per keystroke; runs on any change.
    const handle = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    // Mirror the query into the address bar (shareable) without a navigation.
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, "", url);
  }, [queryString, pathname]);

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

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

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

      <Filters
        fields={filterFields}
        value={filterValues}
        onValueChange={applyFilters}
        labels={filterLabels}
      />

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
                  <TableCell className="font-medium whitespace-nowrap">
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
              onClick={() => setPage(meta.current_page - 1)}
            >
              {t("pagination.previous")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || meta.current_page >= meta.last_page}
              onClick={() => setPage(meta.current_page + 1)}
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
