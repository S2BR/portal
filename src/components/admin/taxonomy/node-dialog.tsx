"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { LocaleFlag } from "@/components/locale-flag";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { locales, localeNames } from "@/i18n/config";
import {
  type AdminCategory,
  displayName,
  type LocaleText,
  TAXONOMY_LOCALE_LABEL,
  type TaxonomyLocale,
  type TaxonomyNode,
} from "@/lib/taxonomy/admin";
import { cn } from "@/lib/utils";

export type NodeKind = "category" | "amenity";

/**
 * A locale map with every value trimmed and empties dropped — matches how the business editor
 * normalizes before saving + dirty-checking, so trailing/leading whitespace is a no-op (no false
 * "unsaved" dot, and it never persists a whitespace-only value).
 */
function trimLocaleText(map: LocaleText): LocaleText {
  const out: LocaleText = {};
  for (const [key, value] of Object.entries(map)) {
    const trimmed = (value ?? "").trim();
    if (trimmed !== "") {
      out[key as TaxonomyLocale] = trimmed;
    }
  }
  return out;
}

/** Flatten the category tree to "Root" / "Root › Child" options for the amenity binding picker. */
function categoryOptions(
  categories: AdminCategory[],
  locale: string,
): { id: number; label: string }[] {
  const options: { id: number; label: string }[] = [];
  for (const root of categories) {
    const rootName = displayName(root.name, locale);
    options.push({ id: root.id, label: rootName });
    for (const child of root.children ?? []) {
      options.push({
        id: child.id,
        label: `${rootName} › ${displayName(child.name, locale)}`,
      });
    }
  }
  return options;
}

/**
 * Create/edit a taxonomy node. Names (and, for amenities, descriptions) are edited per-locale behind
 * a locale tab strip — English is required, the rest optional. Amenities also carry the category
 * bindings that scope them (none = global). Activation is set here only on create; an existing node's
 * live state is toggled from its row.
 */
export function NodeDialog({
  kind,
  open,
  onOpenChange,
  node,
  parentId = null,
  categories,
  onSaved,
}: {
  kind: NodeKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: TaxonomyNode | null;
  parentId?: number | null;
  categories: AdminCategory[];
  onSaved: () => void;
}) {
  const t = useTranslations("admin.taxonomy");
  const locale = useLocale();

  // The dialog is mounted fresh for each open (the parent renders it conditionally), so state is
  // seeded directly from props — no sync effect needed.
  const amenityNode =
    kind === "amenity"
      ? (node as {
          description?: LocaleText | null;
          category_ids?: number[];
        } | null)
      : null;

  const [name, setName] = useState<LocaleText>(node?.name ?? {});
  const [description, setDescription] = useState<LocaleText>(
    amenityNode?.description ?? {},
  );
  const [slug, setSlug] = useState(node?.slug ?? "");
  const [categoryIds, setCategoryIds] = useState<number[]>(
    amenityNode?.category_ids ?? [],
  );
  const [active, setActive] = useState(true);
  const [activeLocale, setActiveLocale] = useState<TaxonomyLocale>("en");
  const [saving, setSaving] = useState(false);
  const [bindingSearch, setBindingSearch] = useState("");

  const editing = Boolean(node);
  const path = kind === "category" ? "categories" : "amenities";
  const options = categoryOptions(categories, locale);
  const query = bindingSearch.trim().toLowerCase();
  const visibleOptions = query
    ? options.filter((option) => option.label.toLowerCase().includes(query))
    : options;

  // A locale tab is "dirty" when its name (or, for amenities, description) differs from the value the
  // dialog opened with — mirrors the unsaved-changes dot on the business editor's tabs.
  const originalName = node?.name ?? {};
  const originalDescription = amenityNode?.description ?? {};
  const isLocaleDirty = (key: TaxonomyLocale): boolean =>
    (name[key] ?? "").trim() !== (originalName[key] ?? "").trim() ||
    (kind === "amenity" &&
      (description[key] ?? "").trim() !==
        (originalDescription[key] ?? "").trim());

  function setLocaleValue(
    map: LocaleText,
    setMap: (value: LocaleText) => void,
    value: string,
  ) {
    setMap({ ...map, [activeLocale]: value });
  }

  function toggleCategory(id: number) {
    setCategoryIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function save() {
    const trimmedName = trimLocaleText(name);
    if (!trimmedName.en) {
      setActiveLocale("en");
      toast.error(t("dialog.nameRequired"));
      return;
    }

    const body: Record<string, unknown> = { name: trimmedName };
    if (slug.trim()) {
      body.slug = slug.trim();
    }
    if (kind === "amenity") {
      body.description = trimLocaleText(description);
      body.category_ids = categoryIds;
    }
    if (!editing) {
      body.active = active;
      if (parentId !== null) {
        body.parent_id = parentId;
      }
    }

    setSaving(true);
    const response = await fetch(
      editing
        ? `/api/admin/taxonomy/${path}/${node!.id}`
        : `/api/admin/taxonomy/${path}`,
      {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    setSaving(false);

    if (!response.ok) {
      toast.error(t(response.status === 403 ? "forbidden" : "saveError"));
      return;
    }
    toast.success(t(editing ? "toast.saved" : "toast.created"));
    onOpenChange(false);
    onSaved();
  }

  const isChild = editing ? node!.parent_id !== null : parentId !== null;
  // Explicit title key per verb×kind×level, so each language reads naturally (no interpolated noun).
  const kindPart = kind === "category" ? "Category" : "Amenity";
  const levelPart = isChild ? "Child" : "Root";
  const titleKey = `dialog.title.${editing ? "edit" : "create"}${kindPart}${levelPart}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>{t("dialog.help")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <Tabs
            value={activeLocale}
            onValueChange={(value) => setActiveLocale(value as TaxonomyLocale)}
          >
            {/* Flag + language name per locale; wraps because there are eight. */}
            <TabsList className="h-auto flex-wrap justify-start gap-1">
              {locales.map((locale) => {
                const key = locale.replace("-", "_") as TaxonomyLocale;
                const filled = Boolean(name[key]?.trim());
                return (
                  <TabsTrigger key={locale} value={key}>
                    <LocaleFlag
                      locale={locale}
                      className={cn(
                        "size-4",
                        !filled && "opacity-40 grayscale",
                      )}
                    />
                    {/* The language's own name, region parenthetical dropped to keep the tab compact. */}
                    {localeNames[locale].replace(/\s*\(.+\)$/, "")}
                    {isLocaleDirty(key) ? (
                      <span
                        className="bg-brand-gold size-1.5 shrink-0 rounded-full"
                        aria-label={t("dialog.unsaved")}
                      />
                    ) : null}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="node-name">{t("dialog.name")}</Label>
            <Input
              id="node-name"
              value={name[activeLocale] ?? ""}
              onChange={(event) =>
                setLocaleValue(name, setName, event.target.value)
              }
              placeholder={t("dialog.namePlaceholder", {
                locale: TAXONOMY_LOCALE_LABEL[activeLocale],
              })}
            />
          </div>

          {kind === "amenity" ? (
            <div className="space-y-2">
              <Label htmlFor="node-description">
                {t("dialog.description")}
              </Label>
              <Textarea
                id="node-description"
                value={description[activeLocale] ?? ""}
                onChange={(event) =>
                  setLocaleValue(
                    description,
                    setDescription,
                    event.target.value,
                  )
                }
                rows={2}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="node-slug">{t("dialog.slug")}</Label>
            <Input
              id="node-slug"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder={t("dialog.slugPlaceholder")}
            />
          </div>

          {/* The category bindings that scope an amenity/group (none = shown everywhere). */}
          {kind === "amenity" ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>{t("dialog.bindings")}</Label>
                {categoryIds.length === 0 ? (
                  <Badge variant="neutral">{t("dialog.global")}</Badge>
                ) : (
                  <Badge variant="outline">
                    {t("dialog.bindingsSelected", {
                      count: categoryIds.length,
                    })}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-xs">
                {t("dialog.bindingsHelp")}
              </p>
              {options.length === 0 ? (
                <p className="text-muted-foreground rounded-md border p-3 text-sm">
                  {t("dialog.noCategories")}
                </p>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={bindingSearch}
                    onChange={(event) => setBindingSearch(event.target.value)}
                    placeholder={t("dialog.bindingsSearch")}
                  />
                  <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-3">
                    {visibleOptions.length === 0 ? (
                      <p className="text-muted-foreground text-sm">
                        {t("dialog.noMatches")}
                      </p>
                    ) : (
                      visibleOptions.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={categoryIds.includes(option.id)}
                            onCheckedChange={() => toggleCategory(option.id)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {!editing ? (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="node-active">{t("dialog.active")}</Label>
                <p className="text-muted-foreground text-xs">
                  {t("dialog.activeHelp")}
                </p>
              </div>
              <Switch
                id="node-active"
                checked={active}
                onCheckedChange={setActive}
              />
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("dialog.cancel")}
          </Button>
          <Button onClick={save} disabled={saving}>
            {t(editing ? "dialog.save" : "dialog.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
