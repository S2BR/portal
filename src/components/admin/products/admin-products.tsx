"use client";

import {
  Calendar,
  Check,
  CircleDot,
  Eye,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Type,
  Upload,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminProductBody,
  AdminProductListItem,
  ModerationStatus,
} from "@/app/api/admin/products/route";
import {
  Filters,
  type FilterField,
  type FilterValue,
  type FiltersLabels,
} from "@/components/ui/filters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  paramsToPills,
  pillsToParams,
  type ScopeSpec,
} from "@/lib/filters/pill";

const STATUSES = ["approved", "pending", "rejected", "draft"] as const;

/** `q` (fuzzy name) and `visibility` ride top-level params; the other pills are `filter[…]` columns. */
const SCOPES: ScopeSpec[] = [
  { field: "q", param: "q" },
  { field: "visibility", param: "visibility", default: "shared" },
];

const VISIBILITIES = ["shared", "private", "all"] as const;

const STATUS_VARIANT: Record<
  ModerationStatus,
  "green" | "gold" | "red" | "neutral"
> = {
  approved: "green",
  pending: "gold",
  rejected: "red",
  draft: "neutral",
};

/**
 * The admin product catalog as a table (like the business directory) + moderation queue. Defaults to
 * the SHARED base catalog (a `visibility` scope pill reveals private products). Server-side filtered
 * via the shared pill {@see Filters} bar → the same `filter[…]` contract the API expects. Rows link to
 * the full-page editor; approve/reject, promote (private→shared), and delete act inline. Loading shows
 * skeletons; paginated.
 */
export function AdminProducts() {
  const t = useTranslations("admin.products");
  const tf = useTranslations("filters");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(() => {
    const raw = Number(searchParams.get("page"));
    return Number.isInteger(raw) && raw > 1 ? raw : 1;
  });

  // The pill filter bar: a fuzzy name search (`q`), the moderation status, the created date, and the
  // visibility scope — the first and last ride top-level params, the middle two as `filter[…]` columns.
  const filterFields: FilterField[] = [
    {
      id: "q",
      label: t("filters.name"),
      icon: Type,
      type: "text",
      operators: [{ id: "contains" }],
      placeholder: t("search"),
    },
    {
      id: "moderation_status",
      label: t("filters.status"),
      icon: CircleDot,
      type: "multiselect",
      options: STATUSES.map((key) => ({
        value: key,
        label: t(`filter.${key}`),
      })),
      operators: [{ id: "is_any_of" }, { id: "is_none_of" }],
    },
    {
      id: "created_at",
      label: t("filters.created"),
      icon: Calendar,
      type: "date",
      operators: [
        { id: "eq" },
        { id: "lt" },
        { id: "gt" },
        { id: "between", shape: "range" },
      ],
    },
    {
      id: "visibility",
      label: t("filters.visibility"),
      icon: Eye,
      type: "select",
      options: VISIBILITIES.map((value) => ({
        value,
        label: t(`filter.${value}`),
      })),
      operators: [{ id: "is" }],
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
    paramsToPills(
      new URLSearchParams(searchParams.toString()),
      filterFields,
      SCOPES,
    ),
  );

  // The URL the current filters + page describe. The refetch keys off this string, and it's mirrored
  // into the address bar via history.replaceState (below) so links stay shareable WITHOUT a router
  // navigation — a soft navigation re-runs the route and steals focus from the search field mid-type.
  const params = pillsToParams(filterValues, filterFields, SCOPES);
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
      const response = await fetch(`/api/admin/products?${queryString}`);
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as {
        data: AdminProductListItem[];
        meta: { current_page: number; last_page: number; total: number };
      };
      setItems(data.data ?? []);
      setMeta(data.meta ?? { current_page: 1, last_page: 1, total: 0 });
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [queryString, t]);

  useEffect(() => {
    // Debounced so typing the name search fires one request, not one per keystroke; runs on any change.
    const handle = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    // Mirror the query into the address bar (shareable) without a navigation, so focus is never stolen.
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    window.history.replaceState(null, "", url);
  }, [queryString, pathname]);

  const patch = async (id: string, body: AdminProductBody, ok: string) => {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(ok);
    void load();
  };

  const promote = async (id: string) => {
    const response = await fetch(`/api/admin/products/${id}/promote`, {
      method: "PUT",
    });
    if (!response.ok) {
      toast.error(t("actionError"));
      return;
    }
    toast.success(t("promoted"));
    void load();
  };

  const remove = async (id: string) => {
    const response = await fetch(`/api/admin/products/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error(t("actionError"));
      return;
    }
    setItems((current) => current.filter((item) => item.id !== id));
    toast.success(t("deleted"));
  };

  const editHref = (id: string) => `/portal/admin/products/${id}`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/portal/admin/products/new">
            <Plus className="size-4" aria-hidden />
            {t("new")}
          </Link>
        </Button>
      </header>

      <Filters
        fields={filterFields}
        value={filterValues}
        onValueChange={applyFilters}
        labels={filterLabels}
      />

      {loading ? (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.scope")}</TableHead>
                <TableHead>{t("table.skus")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[0, 1, 2, 3, 4].map((index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-md" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-6" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Skeleton className="size-8 rounded-md" />
                      <Skeleton className="size-8 rounded-md" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead>{t("table.scope")}</TableHead>
                <TableHead>{t("table.skus")}</TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((product) => (
                <TableRow
                  key={product.id}
                  className="cursor-pointer"
                  onClick={() => router.push(editHref(product.id))}
                >
                  <TableCell>
                    <Link
                      href={editHref(product.id)}
                      className="flex min-w-0 items-center gap-3"
                    >
                      {product.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={product.image}
                          alt=""
                          className="size-10 shrink-0 rounded-md border object-cover"
                        />
                      ) : (
                        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border">
                          <ImageIcon className="size-4" aria-hidden />
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block max-w-xs truncate font-medium">
                          {product.name}
                        </span>
                        {product.brand ? (
                          <span className="text-muted-foreground block text-xs">
                            {product.brand}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[product.moderation_status]}>
                      {t(`filter.${product.moderation_status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {product.is_private ? (
                      <Badge variant="outline">{t("private")}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {t("filter.shared")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {product.sku_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {product.created_at
                      ? format.dateTime(new Date(product.created_at), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  {/* Stop row navigation so the action buttons act in place. */}
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {product.moderation_status === "pending" ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-brand-green"
                            onClick={() =>
                              patch(
                                product.id,
                                { moderation_status: "approved" },
                                t("approved"),
                              )
                            }
                            aria-label={t("approve")}
                          >
                            <Check className="size-4" aria-hidden />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() =>
                              patch(
                                product.id,
                                { moderation_status: "rejected" },
                                t("rejected"),
                              )
                            }
                            aria-label={t("reject")}
                          >
                            <X className="size-4" aria-hidden />
                          </Button>
                        </>
                      ) : null}
                      {product.is_private ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => promote(product.id)}
                          aria-label={t("promote")}
                        >
                          <Upload className="size-4" aria-hidden />
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(editHref(product.id))}
                        aria-label={t("edit")}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(product.id)}
                        aria-label={t("delete")}
                      >
                        <Trash2 className="size-4" aria-hidden />
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
    </div>
  );
}
