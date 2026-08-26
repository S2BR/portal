"use client";

import {
  Check,
  ImageIcon,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { DataFilters } from "@/components/admin/data-filters";
import type {
  AdminProductBody,
  AdminProductListItem,
  ModerationStatus,
} from "@/app/api/admin/products/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { FilterFieldDef } from "@/lib/filters/tree";

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
 * the SHARED base catalog (a visibility scope select reveals private products). Server-side filtered
 * via the shared operator {@see DataFilters} builder. Rows link to the full-page editor; approve/reject,
 * promote (private→shared), and delete act inline. Loading shows skeletons; paginated.
 */
export function AdminProducts() {
  const t = useTranslations("admin.products");
  const format = useFormatter();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const query = searchParams.toString();
  const visibility = searchParams.get("visibility") ?? "shared";

  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const fields: FilterFieldDef[] = [
    {
      name: "moderation_status",
      label: t("filters.status"),
      type: "select",
      quick: true,
      options: (["approved", "pending", "rejected", "draft"] as const).map(
        (key) => ({ value: key, label: t(`filter.${key}`) }),
      ),
    },
    { name: "name", label: t("filters.name"), type: "text" },
    { name: "created_at", label: t("filters.created"), type: "date" },
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/products?${query}`);
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
  }, [query, t]);

  useEffect(() => {
    // Refetch on mount and whenever the URL (filters / visibility / page) changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  function updateParam(mutate: (params: URLSearchParams) => void) {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.replace(
      params.toString() ? `${pathname}?${params.toString()}` : pathname,
      { scroll: false },
    );
  }

  const setVisibility = (value: string) =>
    updateParam((params) => {
      if (value === "shared") {
        params.delete("visibility");
      } else {
        params.set("visibility", value);
      }
      params.delete("page");
    });

  const setPage = (page: number) =>
    updateParam((params) => {
      if (page > 1) {
        params.set("page", String(page));
      } else {
        params.delete("page");
      }
    });

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

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          {t("filters.visibility")}
        </span>
        <Select value={visibility} onValueChange={setVisibility}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VISIBILITIES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`filter.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataFilters fields={fields} />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
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
                <TableRow key={product.id}>
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
                  <TableCell>
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
