"use client";

import { Check, Package, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import type { CatalogMatch } from "@/app/api/businesses/[slug]/products/search/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useTranslations } from "next-intl";

const CURRENCIES = ["CAD", "BRL", "USD", "EUR"] as const;

/** Integer cents → the field's display, decimal auto-placed (1250 → "12.50"), grouped. Empty for null. */
function centsToInput(cents: number | null): string {
  if (cents === null) {
    return "";
  }
  return (cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** The field's text → integer cents, reading digits only (the last two are cents). Null when empty. */
function inputToCents(value: string): number | null {
  const digits = value.replace(/\D/g, "");
  return digits === "" ? null : Number.parseInt(digits, 10);
}

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents === null) {
    return "—";
  }
  const amount = (cents / 100).toFixed(2);
  return currency ? `${currency} ${amount}` : amount;
}

/**
 * A money field that formats as you type — digits fill from the right and the decimal separator is
 * placed automatically (type "350" → "3.50"), so there's no separator key to hit. Holds and emits
 * integer cents (the unit the API stores).
 */
function MoneyInput({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (cents: number | null) => void;
}) {
  return (
    <Input
      type="text"
      inputMode="numeric"
      value={centsToInput(value)}
      onChange={(event) => onChange(inputToCents(event.target.value))}
      placeholder="0.00"
    />
  );
}

/**
 * The owner "Products" tab: a business's catalog as sightings. Add an existing catalog product (search
 * by name/barcode) or create a handmade item inline, each with a price; edit the price/availability or
 * remove it. Images are pending (uploads phase). Money is entered in the currency's main unit and sent
 * as integer minor units (cents).
 */
export function OwnerProducts({ businessSlug }: { businessSlug: string }) {
  const t = useTranslations("businesses.products");

  const base = `/api/businesses/${encodeURIComponent(businessSlug)}/products`;

  const [items, setItems] = useState<CatalogSighting[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(base);
      if (!response.ok) {
        toast.error(t("loadError"));
        return;
      }
      const data = (await response.json()) as { products: CatalogSighting[] };
      setItems(data.products ?? []);
    } catch {
      toast.error(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [base, t]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const remove = async (sighting: CatalogSighting) => {
    const response = await fetch(`${base}/${sighting.id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      toast.error(t("actionError"));
      return;
    }
    setItems((current) => current.filter((item) => item.id !== sighting.id));
    toast.success(t("removed"));
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
      </header>

      <AddPanel base={base} onAdded={load} />

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground rounded-xl border border-dashed py-12 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <CatalogRow
              key={item.id}
              base={base}
              item={item}
              onChanged={(next) =>
                setItems((current) =>
                  current.map((row) => (row.id === next.id ? next : row)),
                )
              }
              onRemove={() => remove(item)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One catalog row with inline price/availability editing. */
function CatalogRow({
  base,
  item,
  onChanged,
  onRemove,
}: {
  base: string;
  item: CatalogSighting;
  onChanged: (next: CatalogSighting) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("businesses.products");
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState<number | null>(item.price);
  const [currency, setCurrency] = useState(item.currency ?? "CAD");
  const [available, setAvailable] = useState(item.is_available);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${base}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price,
          currency,
          unavailable: !available,
        }),
      });
      if (!response.ok) {
        toast.error(t("actionError"));
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      onChanged(data.product);
      setEditing(false);
      toast.success(t("updated"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="bg-card rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-medium">
            <span className="truncate">
              {item.variant?.product?.name ?? "—"}
            </span>
            {item.variant?.label ? (
              <span className="text-muted-foreground text-sm font-normal">
                {item.variant.label}
              </span>
            ) : null}
            {item.variant?.product?.is_homemade ? (
              <Badge variant="neutral">{t("homemade")}</Badge>
            ) : null}
            {!item.is_available ? (
              <Badge variant="outline">{t("unavailable")}</Badge>
            ) : null}
          </p>
          <p className="text-muted-foreground text-sm">
            {item.variant?.product?.brand
              ? `${item.variant.product.brand} · `
              : ""}
            {formatPrice(item.price, item.currency)}
          </p>
        </div>
        {!editing ? (
          <div className="flex shrink-0 gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(true)}
              aria-label={t("edit")}
            >
              <Pencil className="size-4" aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onRemove}
              aria-label={t("remove")}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto]">
          <Field label={t("price")}>
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
          <Field label={t("currency")}>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label={t("available")}>
            <div className="flex h-9 items-center">
              <Switch checked={available} onCheckedChange={setAvailable} />
            </div>
          </Field>
          <div className="flex gap-2 sm:col-span-3">
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="gap-1.5"
            >
              <Check className="size-4" aria-hidden />
              {t("save")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditing(false)}
              className="gap-1.5"
            >
              <X className="size-4" aria-hidden />
              {t("cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

type CatalogVariant = CatalogMatch["variants"][number];

function variantLabel(variant: CatalogVariant, fallback: string): string {
  return variant.label ?? variant.size ?? variant.barcode ?? fallback;
}

/** The "add a product" panel — search the catalog (pick a size/variant), or add a handmade item. */
function AddPanel({ base, onAdded }: { base: string; onAdded: () => void }) {
  const t = useTranslations("businesses.products");
  const [mode, setMode] = useState<"idle" | "search" | "new">("idle");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogMatch[]>([]);
  const [selected, setSelected] = useState<CatalogMatch | null>(null);
  const [variant, setVariant] = useState<CatalogVariant | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState("CAD");
  const [saving, setSaving] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setMode("idle");
    setQuery("");
    setResults([]);
    setSelected(null);
    setVariant(null);
    setName("");
    setPrice(null);
    setCurrency("CAD");
  };

  /** Pick a product; auto-select its size when there's only one. */
  const pickProduct = (match: CatalogMatch) => {
    setSelected(match);
    setVariant(
      match.variants.length === 1 ? (match.variants[0] ?? null) : null,
    );
  };

  useEffect(() => {
    if (mode !== "search" || selected !== null || query.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    if (timer.current) {
      clearTimeout(timer.current);
    }
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `${base}/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (response.ok) {
          const data = (await response.json()) as { products: CatalogMatch[] };
          setResults(data.products ?? []);
        }
      } catch {
        // A failed search just shows no matches.
      }
    }, 300);
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [base, mode, query, selected]);

  const submit = async () => {
    setSaving(true);
    try {
      const body =
        mode === "search"
          ? { variant_id: variant?.id, price, currency }
          : {
              product: { name: name.trim() },
              price,
              currency,
            };

      const response = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        toast.error(t("addError"));
        return;
      }
      toast.success(t("added"));
      reset();
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  if (mode === "idle") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setMode("search")} className="gap-1.5">
          <Search className="size-4" aria-hidden />
          {t("addExisting")}
        </Button>
        <Button
          variant="outline"
          onClick={() => setMode("new")}
          className="gap-1.5"
        >
          <Plus className="size-4" aria-hidden />
          {t("addHandmade")}
        </Button>
      </div>
    );
  }

  const readyForPrice = mode === "new" || variant !== null;
  const canSubmit =
    (mode === "search" ? variant !== null : name.trim() !== "") && !saving;

  return (
    <div className="bg-muted/30 space-y-4 rounded-xl border p-4">
      {mode === "search" && selected === null ? (
        <div className="space-y-3">
          <Field label={t("searchLabel")}>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchPlaceholder")}
            />
          </Field>
          {results.length > 0 ? (
            <ul className="divide-y rounded-lg border">
              {results.map((match) => (
                <li key={match.id}>
                  <button
                    type="button"
                    onClick={() => pickProduct(match)}
                    className="hover:bg-muted/60 flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
                  >
                    <Package
                      className="text-muted-foreground size-4"
                      aria-hidden
                    />
                    <span className="font-medium">{match.name}</span>
                    {match.brand ? (
                      <span className="text-muted-foreground">
                        {match.brand}
                      </span>
                    ) : null}
                    <span className="text-muted-foreground ml-auto text-xs">
                      {t("sizeCount", { count: match.variants.length })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim() !== "" ? (
            <p className="text-muted-foreground text-sm">{t("noMatches")}</p>
          ) : null}
        </div>
      ) : null}

      {/* A picked product with more than one size: choose which SKU to carry. */}
      {mode === "search" && selected !== null && variant === null ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {selected.name} — {t("pickSize")}
          </p>
          <div className="flex flex-wrap gap-2">
            {selected.variants.map((option) => (
              <Button
                key={option.id}
                size="sm"
                variant="outline"
                onClick={() => setVariant(option)}
              >
                {variantLabel(option, t("defaultSize"))}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {mode === "new" ? (
        <Field label={t("handmadeName")}>
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("handmadePlaceholder")}
          />
        </Field>
      ) : null}

      {mode === "search" && selected !== null && variant !== null ? (
        <p className="text-sm">
          {t("selected")}{" "}
          <span className="font-medium">
            {selected.name} · {variantLabel(variant, t("defaultSize"))}
          </span>
        </p>
      ) : null}

      {readyForPrice ? (
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label={t("price")} hint={t("priceHint")}>
            <MoneyInput value={price} onChange={setPrice} />
          </Field>
          <Field label={t("currency")}>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((code) => (
                  <SelectItem key={code} value={code}>
                    {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canSubmit}>
          {t("add")}
        </Button>
        <Button variant="ghost" onClick={reset}>
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
