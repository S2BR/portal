"use client";

import {
  ArrowLeft,
  Check,
  Package,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import type { CatalogSighting } from "@/app/api/businesses/[slug]/products/route";
import {
  searchCatalog,
  type CatalogHit,
  type CatalogVariant,
} from "@/lib/products/typesense";
import { UnitSelect } from "@/components/products/unit-select";
import { CURRENCIES } from "@/lib/products/currencies";
import { unitFor, type UnitCode } from "@/lib/products/units";
import { cn } from "@/lib/utils";
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

/** A product's cover thumbnail, falling back to a neutral icon tile (matching the brands/families rows). */
function ProductThumb({
  image,
  name,
  size = "md",
}: {
  image: string | null;
  name: string;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "size-10" : "size-14";
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={cn(dimension, "shrink-0 rounded-md border object-cover")}
      />
    );
  }
  return (
    <span
      className={cn(
        dimension,
        "bg-muted text-muted-foreground flex shrink-0 items-center justify-center rounded-md border",
      )}
    >
      <Package className="size-5" aria-hidden />
    </span>
  );
}

/**
 * The owner "Products" tab: a business's catalog as sightings. Add an existing catalog product (search
 * by name/barcode) or a handmade item via a dialog, each with a price; edit the price/availability or
 * remove it. Money is entered in the currency's main unit and sent as integer minor units (cents).
 * Shares the workspace shell (header + card list) with the other business tabs.
 */
export function OwnerProducts({ businessSlug }: { businessSlug: string }) {
  const t = useTranslations("businesses.products");

  const base = `/api/businesses/${encodeURIComponent(businessSlug)}/products`;

  const [items, setItems] = useState<CatalogSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<CatalogSighting | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

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

  // Re-adding an existing SKU updates its sighting rather than duplicating, so upsert by id.
  const upsert = (saved: CatalogSighting) => {
    setItems((current) =>
      current.some((item) => item.id === saved.id)
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [saved, ...current],
    );
  };

  const patch = (next: CatalogSighting) =>
    setItems((current) =>
      current.map((item) => (item.id === next.id ? next : item)),
    );

  const confirmDelete = async () => {
    const target = pendingDelete;
    if (!target) {
      return;
    }
    setDeleting(true);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== target.id)); // optimistic
    try {
      const response = await fetch(`${base}/${target.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setItems(previous); // rollback
        toast.error(t("actionError"));
        return;
      }
      toast.success(t("removed"));
    } catch {
      setItems(previous);
      toast.error(t("actionError"));
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{t("subtitle")}</p>
        </div>
        <Button className="shrink-0 gap-1.5" onClick={() => setAdding(true)}>
          <Plus className="size-4" aria-hidden />
          {t("addProduct")}
        </Button>
      </header>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : (
        <ul className="space-y-4">
          {items.map((item) => (
            <ProductRow
              key={item.id}
              base={base}
              item={item}
              onChanged={patch}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </ul>
      )}

      <AddProductDialog
        base={base}
        open={adding}
        onOpenChange={setAdding}
        onAdded={upsert}
      />

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("removeConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("removeConfirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={deleting}>
                {t("cancel")}
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {t("remove")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** One catalog row — a workspace card with an optimistic inline price/availability editor. */
function ProductRow({
  base,
  item,
  onChanged,
  onDelete,
}: {
  base: string;
  item: CatalogSighting;
  onChanged: (next: CatalogSighting) => void;
  onDelete: () => void;
}) {
  const t = useTranslations("businesses.products");
  const format = useFormatter();
  const [editing, setEditing] = useState(false);
  const [price, setPrice] = useState<number | null>(item.price);
  const [currency, setCurrency] = useState(item.currency ?? CURRENCIES[0]);
  const [available, setAvailable] = useState(item.is_available);
  const [saving, setSaving] = useState(false);

  const product = item.variant?.product ?? null;

  // The SKU quantity as "amount symbol" (e.g. "350 ml"); shown when there's no human label.
  const quantity =
    [item.variant?.size, unitFor(item.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") || null;

  const priceLabel =
    item.price === null
      ? "—"
      : format.number(item.price / 100, {
          style: "currency",
          currency: item.currency ?? CURRENCIES[0],
        });

  const save = async () => {
    setSaving(true);
    const optimistic: CatalogSighting = {
      ...item,
      price,
      currency,
      is_available: available,
    };
    onChanged(optimistic); // reflect immediately, reconcile with the server below
    try {
      const response = await fetch(`${base}/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, currency, unavailable: !available }),
      });
      if (!response.ok) {
        onChanged(item); // rollback
        toast.error(t("actionError"));
        return;
      }
      const data = (await response.json()) as { product: CatalogSighting };
      onChanged(data.product);
      setEditing(false);
      toast.success(t("updated"));
    } catch {
      onChanged(item);
      toast.error(t("actionError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <li className="bg-muted/40 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <ProductThumb
          image={product?.image ?? null}
          name={product?.name ?? ""}
        />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <span className="truncate">{product?.name ?? "—"}</span>
            {item.variant?.label ? (
              <span className="text-muted-foreground text-sm font-normal">
                {item.variant.label}
              </span>
            ) : quantity ? (
              <span className="text-muted-foreground text-sm font-normal">
                {quantity}
              </span>
            ) : null}
            {product?.is_homemade ? (
              <Badge variant="neutral">{t("homemade")}</Badge>
            ) : null}
          </p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {product?.brand ? `${product.brand} · ` : ""}
            <span className="text-foreground font-medium">{priceLabel}</span>
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "size-1.5 rounded-full",
                item.is_available ? "bg-brand-green" : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            <span className="text-muted-foreground">
              {item.is_available ? t("available") : t("unavailable")}
            </span>
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
              onClick={onDelete}
              aria-label={t("remove")}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </div>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-4 grid gap-4 border-t pt-4 sm:grid-cols-[1fr_auto_auto]">
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
              onClick={() => void save()}
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
              disabled={saving}
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

/**
 * The add-product dialog: choose the catalog (search Typesense directly, pick a SKU) or a handmade
 * item, set a price, and add it. In the handmade path, matching catalog products surface as you type
 * the name so the owner carries the existing product instead of a duplicate. Closes and hands the
 * created sighting back on success.
 */
function AddProductDialog({
  base,
  open,
  onOpenChange,
  onAdded,
}: {
  base: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (saved: CatalogSighting) => void;
}) {
  const t = useTranslations("businesses.products");
  const [mode, setMode] = useState<"search" | "new">("search");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogHit[]>([]);
  const [selected, setSelected] = useState<CatalogHit | null>(null);
  const [variant, setVariant] = useState<CatalogVariant | null>(null);

  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<CatalogHit[]>([]);
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<UnitCode | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>(CURRENCIES[0]);
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => {
    setMode("search");
    setQuery("");
    setResults([]);
    setSelected(null);
    setVariant(null);
    setName("");
    setSuggestions([]);
    setAmount("");
    setUnit(null);
    setPrice(null);
    setCurrency(CURRENCIES[0]);
  };

  /** Pick a product; auto-select its size when there's only one. */
  const pickProduct = (match: CatalogHit) => {
    setSelected(match);
    setVariant(
      match.variants.length === 1 ? (match.variants[0] ?? null) : null,
    );
  };

  /** A typed handmade name matched an existing catalog product: carry that instead of a duplicate. */
  const pickSuggestion = (match: CatalogHit) => {
    setMode("search");
    setSuggestions([]);
    setName("");
    pickProduct(match);
  };

  // Catalog search (search mode) — direct Typesense, no API/DB in the path.
  useEffect(() => {
    if (
      !open ||
      mode !== "search" ||
      selected !== null ||
      query.trim() === ""
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults([]);
      return;
    }
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    searchTimer.current = setTimeout(() => {
      void searchCatalog(query.trim()).then(setResults);
    }, 300);
    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }
    };
  }, [open, mode, query, selected]);

  // Dedup suggestions while typing a handmade name — nudge toward the existing catalog product.
  useEffect(() => {
    if (!open || mode !== "new" || name.trim() === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    if (suggestTimer.current) {
      clearTimeout(suggestTimer.current);
    }
    suggestTimer.current = setTimeout(() => {
      void searchCatalog(name.trim()).then(setSuggestions);
    }, 300);
    return () => {
      if (suggestTimer.current) {
        clearTimeout(suggestTimer.current);
      }
    };
  }, [open, mode, name]);

  const submit = async () => {
    setSaving(true);
    try {
      const body =
        mode === "search"
          ? { variant_id: variant?.id, price, currency }
          : {
              product: {
                name: name.trim(),
                size: amount.trim() || null,
                unit,
              },
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
      const data = (await response.json()) as { product: CatalogSighting };
      onAdded(data.product);
      toast.success(t("added"));
      reset();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const readyForPrice = mode === "new" || variant !== null;
  const canSubmit =
    (mode === "search" ? variant !== null : name.trim() !== "") && !saving;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("addProduct")}</DialogTitle>
          <DialogDescription>{t("addProductDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Catalog vs handmade — a segmented switch. */}
          <div className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "search"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Search className="size-4" aria-hidden />
              {t("addExisting")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("new");
                setSelected(null);
                setVariant(null);
              }}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "new"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Plus className="size-4" aria-hidden />
              {t("addHandmade")}
            </button>
          </div>

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
                <ul className="space-y-2">
                  {results.map((match) => (
                    <li key={match.id}>
                      <button
                        type="button"
                        onClick={() => pickProduct(match)}
                        className="bg-muted/40 hover:bg-muted/70 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
                      >
                        <ProductThumb
                          image={match.image}
                          name={match.name}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {match.name}
                          </span>
                          {match.brand ? (
                            <span className="text-muted-foreground block truncate text-xs">
                              {match.brand}
                            </span>
                          ) : null}
                        </span>
                        <span className="text-muted-foreground shrink-0 text-xs">
                          {t("sizeCount", { count: match.variants.length })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : query.trim() !== "" ? (
                <p className="text-muted-foreground text-sm">
                  {t("noMatches")}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* A picked product with more than one size: choose which SKU to carry. */}
          {mode === "search" && selected !== null && variant === null ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="-ms-1.5 size-8 shrink-0"
                  onClick={() => setSelected(null)}
                  aria-label={t("back")}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </Button>
                <ProductThumb
                  image={selected.image}
                  name={selected.name}
                  size="sm"
                />
                <p className="min-w-0 text-sm font-medium">
                  <span className="truncate">{selected.name}</span>{" "}
                  <span className="text-muted-foreground font-normal">
                    — {t("pickSize")}
                  </span>
                </p>
              </div>
              <div className="flex flex-col gap-2">
                {selected.variants.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVariant(option)}
                    className="bg-muted/40 hover:bg-muted/70 flex items-center gap-3 rounded-xl p-2 text-left transition-colors"
                  >
                    <ProductThumb
                      image={option.image ?? selected.image}
                      name={selected.name}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">
                        {option.label || t("defaultSize")}
                      </span>
                      {option.barcode ? (
                        <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs tabular-nums">
                          <ScanBarcode
                            className="size-3.5 shrink-0"
                            aria-hidden
                          />
                          {option.barcode}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {mode === "search" && selected !== null && variant !== null ? (
            <div className="bg-muted/40 flex items-center gap-3 rounded-xl p-3">
              <ProductThumb
                image={variant.image ?? selected.image}
                name={selected.name}
                size="sm"
              />
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  <span className="font-medium">{selected.name}</span>{" "}
                  <span className="text-muted-foreground">
                    · {variant.label || t("defaultSize")}
                  </span>
                </p>
                {variant.barcode ? (
                  <span className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs tabular-nums">
                    <ScanBarcode className="size-3.5 shrink-0" aria-hidden />
                    {variant.barcode}
                  </span>
                ) : null}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSelected(null);
                  setVariant(null);
                }}
              >
                {t("cancel")}
              </Button>
            </div>
          ) : null}

          {mode === "new" ? (
            <div className="space-y-3">
              <Field label={t("handmadeName")}>
                <Input
                  autoFocus
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("handmadePlaceholder")}
                />
              </Field>
              <Field label={t("quantity")}>
                <div className="flex items-center gap-2">
                  <Input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder={t("quantityAmount")}
                    inputMode="decimal"
                    className="w-28 shrink-0"
                  />
                  <div className="flex-1">
                    <UnitSelect value={unit} onChange={setUnit} />
                  </div>
                </div>
              </Field>
              {/* As the name is typed, surface matching catalog products so the owner carries the
                  existing one instead of creating a duplicate. */}
              {suggestions.length > 0 ? (
                <div className="border-brand-green/30 bg-brand-green/5 space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{t("similarHeading")}</p>
                  <ul className="space-y-2">
                    {suggestions.slice(0, 4).map((match) => (
                      <li key={match.id} className="flex items-center gap-3">
                        <ProductThumb
                          image={match.image}
                          name={match.name}
                          size="sm"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {match.name}
                          </span>
                          {match.brand ? (
                            <span className="text-muted-foreground block truncate text-xs">
                              {match.brand}
                            </span>
                          ) : null}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => pickSuggestion(match)}
                        >
                          {t("useThis")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
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
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            {t("cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={!canSubmit}>
            {t("add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
