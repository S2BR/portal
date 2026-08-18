"use client";

import { Lock, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminBusinessRow,
  AdminBusinessesPage,
} from "@/app/api/admin/businesses/route";
import { BusinessLogo } from "@/components/business/business-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const STATUSES = [
  "published",
  "draft",
  "locked",
  "unclaimed",
  "deleted",
] as const;
const TYPES = ["company", "self_employed"] as const;
const ALL = "all";

/**
 * The admin business directory: search all businesses and filter by lifecycle status/type. Each row
 * links to the admin editor for that business. Read-only here; the actions live on the detail page.
 */
export function AdminBusinessesList() {
  const t = useTranslations("admin.businesses");
  const format = useFormatter();

  const [rows, setRows] = useState<AdminBusinessRow[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [type, setType] = useState<string>(ALL);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status !== ALL) params.set("status", status);
    if (type !== ALL) params.set("type", type);
    if (page > 1) params.set("page", String(page));
    try {
      const response = await fetch(
        `/api/admin/businesses?${params.toString()}`,
      );
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as AdminBusinessesPage;
      setRows(data.data);
      setMeta(data.meta);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [query, status, type, page, t]);

  // Debounce the search + filter changes into one fetch.
  useEffect(() => {
    const timer = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(timer);
  }, [load]);

  function resetPageThen(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-1.5">
          <label className="text-muted-foreground text-xs font-medium">
            {t("search")}
          </label>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            placeholder={t("searchPlaceholder")}
          />
        </div>
        <FilterSelect
          label={t("filters.status")}
          value={status}
          onChange={(value) => resetPageThen(setStatus, value)}
          allLabel={t("filters.allStatuses")}
          options={STATUSES.map((key) => ({
            value: key,
            label: t(`status.${key}`),
          }))}
        />
        <FilterSelect
          label={t("filters.type")}
          value={type}
          onChange={(value) => resetPageThen(setType, value)}
          allLabel={t("filters.allTypes")}
          options={TYPES.map((key) => ({
            value: key,
            label: t(`types.${key}`),
          }))}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.business")}</TableHead>
                <TableHead>{t("table.owners")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/portal/admin/businesses/${row.id}`}
                      className="flex items-center gap-3"
                    >
                      <BusinessLogo
                        name={row.name}
                        src={row.logo}
                        className="size-9 shrink-0 rounded-lg"
                        fallbackClassName="text-xs"
                      />
                      <span className="min-w-0">
                        <span className="block max-w-xs truncate font-medium">
                          {row.name}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {t(`types.${row.type}`)}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.owners.length === 0 ? (
                      <span className="italic">{t("unclaimed")}</span>
                    ) : (
                      <span className="block max-w-48 truncate">
                        {row.owners.map((owner) => owner.name).join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadges row={row} t={t} />
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {row.created_at
                      ? format.dateTime(new Date(row.created_at), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
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
    </div>
  );
}

function StatusBadges({
  row,
  t,
}: {
  row: AdminBusinessRow;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {row.is_deleted ? (
        <Badge variant="red" className="gap-1">
          <Trash2 className="size-3" aria-hidden />
          {t("status.deleted")}
        </Badge>
      ) : row.is_locked ? (
        <Badge variant="red" className="gap-1">
          <Lock className="size-3" aria-hidden />
          {t("status.locked")}
        </Badge>
      ) : row.is_published ? (
        <Badge variant="green">{t("status.published")}</Badge>
      ) : (
        <Badge variant="neutral">{t("status.draft")}</Badge>
      )}
      {!row.is_claimed ? (
        <Badge variant="outline">{t("status.unclaimed")}</Badge>
      ) : null}
    </span>
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
        <SelectTrigger className="w-44">
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
