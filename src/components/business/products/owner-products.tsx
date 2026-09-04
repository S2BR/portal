"use client";

import {
  ArrowLeft,
  ChevronDown,
  Package,
  Pencil,
  Plus,
  ScanBarcode,
  Search,
  Trash2,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterMultiSelect } from "@/components/admin/filter-multi-select";
import {
  OFFERING_STATUSES,
  OFFERING_STATUS_VARIANT,
  type OfferingStatus,
} from "@/lib/products/offering-status";

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
export function MoneyInput({
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
export function ProductThumb({
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

/** A price-range filter facet — the same chip look as the status filter, opening min/max money inputs. */
function PriceFacet({
  label,
  minLabel,
  maxLabel,
  min,
  max,
  onMin,
  onMax,
}: {
  label: string;
  minLabel: string;
  maxLabel: string;
  min: number | null;
  max: number | null;
  onMin: (cents: number | null) => void;
  onMax: (cents: number | null) => void;
}) {
  const active = min !== null || max !== null;
  const badge = active
    ? [min, max]
        .map((value) => (value === null ? "" : (value / 100).toFixed(2)))
        .join("–")
    : null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {badge ? (
            <Badge variant="neutral" className="tabular-nums">
              {badge}
            </Badge>
          ) : null}
          <ChevronDown className="size-4 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        <Field label={minLabel}>
          <MoneyInput value={min} onChange={onMin} />
        </Field>
        <Field label={maxLabel}>
          <MoneyInput value={max} onChange={onMax} />
        </Field>
      </PopoverContent>
    </Popover>
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
  const tStatus = useTranslations("offeringStatus");
  const tFilters = useTranslations("filters");
  const format = useFormatter();
  const router = useRouter();

  const base = `/api/businesses/${encodeURIComponent(businessSlug)}/products`;
  const detailHref = (id: string) =>
    `/portal/businesses/${encodeURIComponent(businessSlug)}/products/${id}`;

  const [items, setItems] = useState<CatalogSighting[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [priceMin, setPriceMin] = useState<number | null>(null);
  const [priceMax, setPriceMax] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CatalogSighting | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  // Catalogs are small and fully loaded, so filter client-side (no API round-trip).
  const filtered = items.filter((item) => {
    const name = item.variant?.product?.name ?? "";
    const matchesSearch =
      search.trim() === "" ||
      name.toLowerCase().includes(search.trim().toLowerCase());
    const matchesStatus =
      selectedStatuses.length === 0 ||
      selectedStatuses.includes(item.offering_status);
    const matchesPrice =
      (priceMin === null && priceMax === null) ||
      (item.price !== null &&
        (priceMin === null || item.price >= priceMin) &&
        (priceMax === null || item.price <= priceMax));
    return matchesSearch && matchesStatus && matchesPrice;
  });

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

      {!loading && items.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("searchProducts")}
              className="pl-8"
            />
          </div>
          <FilterMultiSelect
            label={t("table.status")}
            options={OFFERING_STATUSES.map((value) => ({
              value,
              label: tStatus(value),
            }))}
            selected={selectedStatuses}
            onChange={setSelectedStatuses}
            searchPlaceholder={tFilters("search")}
            emptyLabel={tFilters("noResults")}
          />
          <PriceFacet
            label={t("filterPrice")}
            minLabel={t("min")}
            maxLabel={t("max")}
            min={priceMin}
            max={priceMax}
            onMin={setPriceMin}
            onMax={setPriceMax}
          />
        </div>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl p-10 text-center text-sm">
          {t("empty")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground rounded-2xl p-10 text-center text-sm">
          {t("noMatches")}
        </div>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.product")}</TableHead>
                <TableHead>{t("table.quantity")}</TableHead>
                <TableHead>{t("table.price")}</TableHead>
                <TableHead>{t("table.status")}</TableHead>
                <TableHead className="text-right">
                  {t("table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => {
                const product = item.variant?.product ?? null;
                const quantity =
                  [item.variant?.size, unitFor(item.variant?.unit)?.symbol]
                    .filter((part): part is string => Boolean(part))
                    .join(" ") ||
                  (item.variant?.label ?? "—");
                const price =
                  item.price !== null
                    ? format.number(item.price / 100, {
                        style: "currency",
                        currency: item.currency ?? "BRL",
                      })
                    : "—";
                const status = item.offering_status as OfferingStatus;
                return (
                  <TableRow
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(detailHref(item.id))}
                  >
                    <TableCell>
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductThumb
                          image={product?.image ?? null}
                          name={product?.name ?? ""}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="block truncate font-medium">
                            {product?.name ?? "—"}
                          </span>
                          {product?.brand ? (
                            <span className="text-muted-foreground block truncate text-xs">
                              {product.brand}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground whitespace-nowrap tabular-nums">
                      {quantity}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {price}
                    </TableCell>
                    <TableCell>
                      <Badge variant={OFFERING_STATUS_VARIANT[status]}>
                        {tStatus(status)}
                      </Badge>
                    </TableCell>
                    {/* Stop row navigation so the actions act in place. */}
                    <TableCell onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          aria-label={t("edit")}
                        >
                          <Link href={detailHref(item.id)}>
                            <Pencil className="size-4" aria-hidden />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setPendingDelete(item)}
                          aria-label={t("remove")}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
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
          {/* Catalog vs handmade — a segmented switch, on the shared Tabs primitive. */}
          <Tabs
            value={mode}
            onValueChange={(value) => {
              const next = value as "search" | "new";
              setMode(next);
              if (next === "new") {
                setSelected(null);
                setVariant(null);
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">
                <Search className="size-4" aria-hidden />
                {t("addExisting")}
              </TabsTrigger>
              <TabsTrigger value="new">
                <Plus className="size-4" aria-hidden />
                {t("addHandmade")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

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
