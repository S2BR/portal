"use client";

import { GripVertical, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import type { ProductSection } from "@/app/api/businesses/[slug]/product-sections/route";
import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import { LocaleFlag } from "@/components/locale-flag";
import { localeNames, locales } from "@/i18n/config";
import { displayName, type LocaleText } from "@/lib/taxonomy/admin";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SortableList } from "@/components/ui/sortable-list";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** The API locale key (underscored, e.g. `pt_BR`) for a portal locale (`pt-BR`). */
const apiKey = (locale: string) => locale.replace("-", "_");

/** A product's label for the picker: its name + quantity. */
function productLabel(sighting: CatalogSighting): string {
  const name = sighting.variant?.product?.name ?? "—";
  const quantity = sighting.variant?.size
    ? ` · ${sighting.variant.size}${sighting.variant.unit ? ` ${sighting.variant.unit}` : ""}`
    : sighting.variant?.label
      ? ` · ${sighting.variant.label}`
      : "";
  return `${name}${quantity}`;
}

/**
 * The owner's "Sections" manager on the products page — create / rename / delete sections, drag to
 * reorder them, and set which products sit in each (a picker). Section names are translatable: the
 * owner types one language and may add others. Every change persists immediately and asks the parent
 * to refetch.
 */
export function SectionManager({
  slug,
  products,
  sections,
  onChanged,
}: {
  slug: string;
  products: CatalogSighting[];
  sections: ProductSection[];
  onChanged: () => void;
}) {
  const t = useTranslations("businesses.products");
  const locale = useLocale();
  const base = `/api/businesses/${encodeURIComponent(slug)}/product-sections`;

  const [editing, setEditing] = useState<ProductSection | "new" | null>(null);
  const [order, setOrder] = useState<ProductSection[] | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ProductSection | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const rows = order ?? sections;

  const reorder = async (next: ProductSection[]) => {
    setOrder(next); // optimistic
    const response = await fetch(`${base}/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((section) => section.id) }),
    });
    if (!response.ok) {
      setOrder(null);
      toast.error(t("actionError"));
      return;
    }
    setOrder(null);
    onChanged();
  };

  const remove = async () => {
    if (!pendingDelete) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(`${base}/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      toast.success(t("sections.deleted"));
      onChanged();
    } finally {
      setBusy(false);
      setPendingDelete(null);
    }
  };

  const setProducts = async (section: ProductSection, ids: string[]) => {
    const response = await fetch(`${base}/${section.id}/products`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      toast.error(t("actionError"));
      return;
    }
    onChanged();
  };

  return (
    <div className="bg-card space-y-4 rounded-2xl border p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-medium">{t("sections.title")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("sections.subtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => setEditing("new")}
        >
          <Plus className="size-4" aria-hidden />
          {t("sections.add")}
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">
          {t("sections.empty")}
        </p>
      ) : (
        <SortableList
          items={rows}
          getId={(section) => section.id}
          onReorder={reorder}
          strategy="vertical"
          className="space-y-2"
          renderOverlay={(section) => (
            <div className="bg-card rounded-xl border px-3 py-2.5 text-sm font-medium shadow-sm">
              {displayName(section.name as LocaleText, locale)}
            </div>
          )}
          renderItem={(section, render) => (
            <div
              ref={render.setNodeRef}
              style={render.style}
              className={cn(
                "rounded-xl border",
                render.isDragging && "opacity-40",
              )}
            >
              <div className="flex items-center gap-2 px-2 py-2">
                <Button
                  ref={render.handle.ref}
                  {...render.handle.attributes}
                  {...render.handle.listeners}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t("sections.reorder")}
                  className="size-8 shrink-0 cursor-grab touch-none"
                >
                  <GripVertical className="size-4" aria-hidden />
                </Button>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {displayName(section.name as LocaleText, locale)}
                </span>
                <span className="text-muted-foreground text-xs tabular-nums">
                  {t("sections.count", {
                    count: section.product_ids?.length ?? 0,
                  })}
                </span>
                <ProductPicker
                  label={t("sections.products")}
                  products={products}
                  selected={section.product_ids ?? []}
                  onChange={(ids) => setProducts(section, ids)}
                  searchLabel={t("searchProducts")}
                  emptyLabel={t("noMatches")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={t("edit")}
                  onClick={() => setEditing(section)}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive size-8"
                  aria-label={t("remove")}
                  onClick={() => setPendingDelete(section)}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {editing ? (
        <SectionDialog
          base={base}
          section={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            onChanged();
          }}
        />
      ) : null}

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sections.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={busy}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => void remove()}
            >
              {t("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Add or edit products in a section — a checklist of the business's catalog, applied on close. */
function ProductPicker({
  label,
  products,
  selected,
  onChange,
  searchLabel,
  emptyLabel,
}: {
  label: string;
  products: CatalogSighting[];
  selected: string[];
  onChange: (ids: string[]) => void;
  searchLabel: string;
  emptyLabel: string;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8">
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <Command>
          <CommandInput placeholder={searchLabel} />
          <CommandList>
            <CommandEmpty>{emptyLabel}</CommandEmpty>
            {products.map((sighting) => {
              const active = selected.includes(sighting.id);
              return (
                <CommandItem
                  key={sighting.id}
                  value={productLabel(sighting)}
                  onSelect={() => toggle(sighting.id)}
                  className="gap-2"
                >
                  <span
                    className={cn(
                      "border-input flex size-4 items-center justify-center rounded border",
                      active && "bg-primary border-primary",
                    )}
                    aria-hidden
                  >
                    {active ? (
                      <span className="bg-primary-foreground size-2 rounded-sm" />
                    ) : null}
                  </span>
                  <span className="truncate">{productLabel(sighting)}</span>
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Create/rename a section. Its name is translatable: a flag tab per language (the owner's own first),
 * greyed until filled — type in your language, switch flags to add others. At least one is required.
 */
function SectionDialog({
  base,
  section,
  onClose,
  onSaved,
}: {
  base: string;
  section: ProductSection | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("businesses.products");
  const locale = useLocale();

  const [name, setName] = useState<Record<string, string>>(section?.name ?? {});
  const [activeLocale, setActiveLocale] = useState<string>(apiKey(locale));
  const [saving, setSaving] = useState(false);

  const canSave = Object.values(name).some((value) => value.trim() !== "");

  const setActiveValue = (value: string) =>
    setName((current) => ({ ...current, [activeLocale]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        section === null ? base : `${base}/${section.id}`,
        {
          method: section === null ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      toast.success(t("sections.saved"));
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {section === null ? t("sections.add") : t("sections.rename")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* A flag per language (the owner's own first); greyed until that language is filled. */}
          <Tabs value={activeLocale} onValueChange={setActiveLocale}>
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              {locales.map((code) => {
                const key = apiKey(code);
                const filled = Boolean(name[key]?.trim());
                return (
                  <TabsTrigger key={code} value={key}>
                    <LocaleFlag
                      locale={code}
                      className={cn(
                        "size-4",
                        !filled && "opacity-40 grayscale",
                      )}
                    />
                    {localeNames[code].replace(/\s*\(.+\)$/, "")}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <Field label={t("sections.nameLabel")}>
            <Input
              value={name[activeLocale] ?? ""}
              onChange={(event) => setActiveValue(event.target.value)}
              placeholder={t("sections.namePlaceholder")}
              autoFocus
            />
          </Field>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="ghost" disabled={saving}>
              {t("cancel")}
            </Button>
          </DialogClose>
          <Button
            onClick={save}
            disabled={!canSave || saving}
            className="gap-1.5"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
