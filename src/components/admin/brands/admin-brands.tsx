"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { AdminBrand, AdminBrandBody } from "@/app/api/admin/brands/route";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
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

type Draft = { id: string | null; name: string; description: string };

/**
 * The brand manager: a searchable table of brands with product/family counts, and a dialog to create
 * or edit one. Brands are also created implicitly when a product/family names a new one — this is the
 * place to rename, describe, or remove them.
 */
export function AdminBrands() {
  const t = useTranslations("admin.brands");
  const format = useFormatter();
  const router = useRouter();

  const [items, setItems] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/brands${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ""}`,
      );
      if (response.status === 403) {
        toast.error(t("forbidden"));
        return;
      }
      const data = (await response.json()) as { data: AdminBrand[] };
      setItems(data.data ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const save = async () => {
    if (draft === null || draft.name.trim() === "") {
      return;
    }
    setSaving(true);
    try {
      const body: AdminBrandBody = {
        name: draft.name.trim(),
        description: draft.description.trim() || null,
      };
      const response = await fetch(
        draft.id === null
          ? "/api/admin/brands"
          : `/api/admin/brands/${draft.id}`,
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

  const remove = async (brand: AdminBrand) => {
    const response = await fetch(`/api/admin/brands/${brand.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error(t("saveError"));
      return;
    }
    setItems((current) => current.filter((item) => item.id !== brand.id));
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
          onClick={() => setDraft({ id: null, name: "", description: "" })}
        >
          <Plus className="size-4" aria-hidden />
          {t("new")}
        </Button>
      </header>

      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t("search")}
        className="max-w-sm"
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
                <TableHead className="text-right">
                  {t("table.products")}
                </TableHead>
                <TableHead className="text-right">
                  {t("table.families")}
                </TableHead>
                <TableHead>{t("table.created")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((brand) => (
                <TableRow
                  key={brand.id}
                  className="cursor-pointer"
                  onClick={() =>
                    router.push(`/portal/admin/brands/${brand.id}`)
                  }
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-md border">
                        <Tag className="size-4" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <Link
                          href={`/portal/admin/brands/${brand.id}`}
                          className="block truncate font-medium hover:underline"
                        >
                          {brand.name}
                        </Link>
                        {brand.description ? (
                          <span className="text-muted-foreground block max-w-md truncate text-xs">
                            {brand.description}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {brand.product_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {brand.family_count}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {brand.created_at
                      ? format.dateTime(new Date(brand.created_at), {
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
                        <Link href={`/portal/admin/brands/${brand.id}`}>
                          <Pencil className="size-4" aria-hidden />
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => remove(brand)}
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
