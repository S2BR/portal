"use client";

import { Boxes, Pencil, Plus, Trash2, Type } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { AdminBrand } from "@/app/api/admin/brands/route";
import type {
  AdminFamily,
  AdminFamilyBody,
} from "@/app/api/admin/families/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import {
  Filters,
  type FilterField,
  type FilterValue,
  type FiltersLabels,
} from "@/components/ui/filters";
import { Input } from "@/components/ui/input";
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
import { pillsToParams, type ScopeSpec } from "@/lib/filters/pill";

type Draft = {
  id: string | null;
  name: string;
  brand: string;
  description: string;
};

/** The name search rides the top-level `q` param. */
const SCOPES: ScopeSpec[] = [{ field: "q", param: "q" }];

/**
 * The family manager: a searchable table of families (their brand + product count) with a create/edit
 * dialog. The brand field autocompletes from existing brands (a datalist) but accepts a new name too —
 * the API resolves/creates the brand entity.
 */
export function AdminFamilies() {
  const t = useTranslations("admin.families");
  const tf = useTranslations("filters");
  const format = useFormatter();
  const router = useRouter();

  const [items, setItems] = useState<AdminFamily[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<FilterValue[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

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

  const queryString = pillsToParams(
    filterValues,
    filterFields,
    SCOPES,
  ).toString();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/families${queryString ? `?${queryString}` : ""}`,
      );
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as { data: AdminFamily[] };
      setItems(data.data ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [queryString, t]);

  useEffect(() => {
    // Debounced so typing the name search fires one request, not one per keystroke.
    const handle = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(handle);
  }, [load]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/admin/brands");
      if (response.ok) {
        const data = (await response.json()) as { data: AdminBrand[] };
        setBrands(data.data ?? []);
      }
    })();
  }, []);

  const save = async () => {
    if (draft === null || draft.name.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      const body: AdminFamilyBody = {
        name: draft.name.trim(),
        brand: draft.brand.trim() || null,
        description: draft.description.trim() || null,
      };
      const response = await fetch(
        draft.id === null
          ? "/api/admin/families"
          : `/api/admin/families/${draft.id}`,
        {
          method: draft.id === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!response.ok) {
        toast.error(response.status === 422 ? t("duplicate") : t("saveError"));
        return;
      }
      toast.success(t("saved"));
      setDraft(null);
      void load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (family: AdminFamily) => {
    const response = await fetch(`/api/admin/families/${family.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error(t("saveError"));
      return;
    }
    setItems((current) => current.filter((item) => item.id !== family.id));
    toast.success(t("deleted"));
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button
          className="gap-1.5"
          onClick={() =>
            setDraft({ id: null, name: "", brand: "", description: "" })
          }
        >
          <Plus className="size-4" aria-hidden />
          {t("new")}
        </Button>
      </header>

      <Filters
        fields={filterFields}
        value={filterValues}
        onValueChange={setFilterValues}
        labels={filterLabels}
      />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-12 w-full rounded-xl" />
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
                <TableHead>{t("table.name")}</TableHead>
                <TableHead>{t("table.brand")}</TableHead>
                <TableHead className="text-right">
                  {t("table.products")}
                </TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((family) => (
                <TableRow
                  key={family.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/portal/admin/families/${family.id}`)
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
                        <Boxes className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/portal/admin/families/${family.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {family.name}
                        </Link>
                        {family.description ? (
                          <span className="text-muted-foreground block max-w-md truncate text-xs">
                            {family.description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {family.brand ? (
                      <Badge variant="outline">{family.brand.name}</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {family.product_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {family.created_at
                      ? format.dateTime(new Date(family.created_at), {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "—"}
                  </TableCell>
                  {/* Stop row navigation so the action buttons act in place. */}
                  <TableCell onClick={(event) => event.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        aria-label={t("open")}
                      >
                        <Link href={`/portal/admin/families/${family.id}`}>
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(family)}
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

      <Dialog
        open={draft !== null}
        onOpenChange={(open) => (open ? null : setDraft(null))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {draft?.id === null ? t("createTitle") : t("editTitle")}
            </DialogTitle>
          </DialogHeader>
          {draft ? (
            <div className="space-y-4">
              <Field label={t("form.name")}>
                <Input
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  autoFocus
                />
              </Field>
              <Field label={t("form.brand")}>
                <Input
                  value={draft.brand}
                  onChange={(event) =>
                    setDraft({ ...draft, brand: event.target.value })
                  }
                  list="family-brand-options"
                  placeholder={t("form.brandPlaceholder")}
                />
                <datalist id="family-brand-options">
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={t("form.description")}>
                <Textarea
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                  rows={3}
                />
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("cancel")}
            </Button>
            <Button
              onClick={save}
              disabled={saving || (draft?.name.trim() ?? "") === ""}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
