"use client";

import { ImageIcon, Link2, Loader2, Plus, Type, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type {
  AdminProductBody,
  AdminProductListItem,
  AdminProductsPage,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { pillsToParams, type ScopeSpec } from "@/lib/filters/pill";

/** The name search rides the top-level `q` param. */
const SCOPES: ScopeSpec[] = [{ field: "q", param: "q" }];

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
 * The products belonging to one brand or family, on its detail page: a searchable, paginated list
 * with a link to create a pre-assigned product, an "add existing" picker, and per-row detach. Attach
 * and detach both ride the product update (`{brand_id}`/`{family_id}`, `null` to detach) — no separate
 * endpoint. `kind` selects the endpoint and the attach key; the new-product link carries the id so the
 * editor resolves and prefills the line.
 */
export function EntityProducts({
  kind,
  entityId,
}: {
  kind: "brand" | "family";
  entityId: string;
}) {
  const t = useTranslations("admin.catalog");
  const tf = useTranslations("filters");
  const attachKey = kind === "brand" ? "brand_id" : "family_id";
  // The collection segment in the BFF path.
  const collection = kind === "brand" ? "brands" : "families";

  const [items, setItems] = useState<AdminProductListItem[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detaching, setDetaching] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const filterFields: FilterField[] = [
    {
      id: "q",
      label: tf("name"),
      icon: Type,
      type: "text",
      operators: [{ id: "contains" }],
      placeholder: t("search"),
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

  const params = pillsToParams(filterValues, filterFields, SCOPES);
  params.set("page", String(page));
  const queryString = params.toString();
  const hasSearch = params.has("q");

  const applyFilters = (values: FilterValue[]) => {
    setFilterValues(values);
    setPage(1);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/${collection}/${entityId}/products?${queryString}`,
      );
      if (!response.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await response.json()) as AdminProductsPage;
      setItems(data.data ?? []);
      setMeta(data.meta);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [collection, entityId, queryString, t]);

  useEffect(() => {
    const handle = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(handle);
  }, [load]);

  const detach = async (product: AdminProductListItem) => {
    setDetaching(product.id);
    try {
      const body: AdminProductBody = { [attachKey]: null };
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(t("detachError"));
        return;
      }
      setItems((current) => current.filter((item) => item.id !== product.id));
      setMeta((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
      }));
      toast.success(t("detached"));
    } finally {
      setDetaching(null);
    }
  };

  const newProductHref = `/portal/admin/products/new?${kind}Id=${encodeURIComponent(entityId)}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters
          fields={filterFields}
          value={filterValues}
          onValueChange={applyFilters}
          labels={filterLabels}
        />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setPickerOpen(true)}
          >
            <Link2 className="size-4" aria-hidden />
            {t("addExisting")}
          </Button>
          <Button asChild className="gap-1.5">
            <Link href={newProductHref}>
              <Plus className="size-4" aria-hidden />
              {t("newProduct")}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl border p-10 text-center text-sm">
          {hasSearch ? t("noMatches") : t("empty")}
        </div>
      ) : (
        <ul className="divide-border/60 divide-y rounded-xl border">
          {items.map((product) => (
            <li
              key={product.id}
              className="hover:bg-muted/40 flex items-center gap-3 px-3 py-2.5 transition-colors"
            >
              <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                {product.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  <ImageIcon className="size-4" aria-hidden />
                )}
              </span>
              <Link
                href={`/portal/admin/products/${product.id}`}
                className="min-w-0 flex-1"
              >
                <span className="block truncate font-medium">
                  {product.name}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {t("skuCount", { count: product.sku_count })}
                </span>
              </Link>
              <Badge variant={STATUS_VARIANT[product.moderation_status]}>
                {t(`status.${product.moderation_status}`)}
              </Badge>
              {product.is_private ? (
                <Badge variant="outline">{t("private")}</Badge>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive shrink-0 gap-1.5"
                disabled={detaching !== null}
                onClick={() => detach(product)}
                aria-label={t("remove")}
              >
                {detaching === product.id ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <X className="size-4" aria-hidden />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      {meta.last_page > 1 ? (
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-sm">
            {t("pageOf", { page: meta.current_page, total: meta.last_page })}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1 || loading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {t("previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page || loading}
              onClick={() => setPage((current) => current + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      ) : null}

      <AttachExistingDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        attachKey={attachKey}
        entityId={entityId}
        onAttached={() => {
          setPage(1);
          void load();
        }}
      />
    </div>
  );
}

/**
 * The "add existing" picker: searches the whole catalog (all visibilities) by name and attaches the
 * chosen product to this brand/family via the product update.
 */
function AttachExistingDialog({
  open,
  onOpenChange,
  attachKey,
  entityId,
  onAttached,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachKey: "brand_id" | "family_id";
  entityId: string;
  onAttached: () => void;
}) {
  const t = useTranslations("admin.catalog");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminProductListItem[]>([]);
  const [attaching, setAttaching] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handle = setTimeout(() => {
      if (query.trim() === "") {
        setResults([]);
        return;
      }
      void (async () => {
        const params = new URLSearchParams();
        params.set("filter[name][contains]", query.trim());
        params.set("visibility", "all");
        const response = await fetch(
          `/api/admin/products?${params.toString()}`,
        );
        if (response.ok) {
          const data = (await response.json()) as {
            data: AdminProductListItem[];
          };
          setResults(data.data ?? []);
        }
      })();
    }, 350);
    return () => clearTimeout(handle);
  }, [query, open]);

  const attach = async (product: AdminProductListItem) => {
    setAttaching(product.id);
    try {
      const body: AdminProductBody = { [attachKey]: entityId };
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(t("attachError"));
        return;
      }
      toast.success(t("attached"));
      onOpenChange(false);
      setQuery("");
      setResults([]);
      onAttached();
    } finally {
      setAttaching(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("attachTitle")}</DialogTitle>
          <DialogDescription>{t("attachDescription")}</DialogDescription>
        </DialogHeader>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("attachSearch")}
          autoFocus
        />
        <div className="max-h-72 space-y-1.5 overflow-y-auto">
          {results.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {query.trim() === "" ? t("attachHint") : t("attachNoResults")}
            </p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-1.5"
              >
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {item.name}
                  </span>
                  {item.brand ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {item.brand}
                    </span>
                  ) : null}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={attaching !== null}
                  onClick={() => attach(item)}
                  className="shrink-0 gap-1.5"
                >
                  {attaching === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="size-3.5" aria-hidden />
                  )}
                  {t("attachConfirm")}
                </Button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
