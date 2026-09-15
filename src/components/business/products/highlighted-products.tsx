"use client";

import { GripVertical, Package, Plus, Star, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type Dispatch, type SetStateAction, useState } from "react";
import { toast } from "sonner";

import type { CatalogProduct } from "@/app/api/businesses/[slug]/products/route";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SortableList } from "@/components/ui/sortable-list";
import { unitFor } from "@/lib/products/units";
import { cn } from "@/lib/utils";

/** The display name for a listing — the owner's override, else the catalog product name. */
function displayName(product: CatalogProduct): string {
  return product.name ?? product.variant?.product?.name ?? "—";
}

/** A short quantity label (size + unit, or the variant label). */
function quantityLabel(product: CatalogProduct): string {
  return (
    [product.variant?.size, unitFor(product.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    product.variant?.label ||
    ""
  );
}

/** The cover + name + quantity of a listing — shared by the rows and the drag overlay. */
function ProductLine({ product }: { product: CatalogProduct }) {
  const image = product.cover_image;
  return (
    <div className="flex min-w-0 items-center gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
        <img
          src={image}
          alt=""
          className="size-10 shrink-0 rounded-md border object-cover"
        />
      ) : (
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-md border">
          <Package className="size-4" aria-hidden />
        </span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{displayName(product)}</p>
        {quantityLabel(product) ? (
          <p className="text-muted-foreground truncate text-xs">
            {quantityLabel(product)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The "Highlighted" tab — manage the products a business features on its public profile, all in one
 * place: add products to the highlights, drag to reorder how they appear in the profile strip, and
 * remove them. Backed by the listing `featured` flag + `featured/reorder`; edits apply optimistically.
 */
export function HighlightedProducts({
  slug,
  products,
  setProducts,
}: {
  slug: string;
  products: CatalogProduct[];
  setProducts: Dispatch<SetStateAction<CatalogProduct[]>>;
}) {
  const t = useTranslations("businesses.products");
  const locale = useLocale();
  const base = `/api/businesses/${encodeURIComponent(slug)}/products`;
  const [pickerOpen, setPickerOpen] = useState(false);

  const featured = products
    .filter((product) => product.is_featured)
    .sort((a, b) => (a.featured_order ?? 0) - (b.featured_order ?? 0));
  const others = products
    .filter((product) => !product.is_featured)
    .sort((a, b) =>
      displayName(a).localeCompare(displayName(b), locale, {
        sensitivity: "base",
      }),
    );

  const setFeatured = async (product: CatalogProduct, next: boolean) => {
    const previous = products;
    const nextOrder = next
      ? Math.max(0, ...featured.map((f) => f.featured_order ?? 0)) + 1
      : null;
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id
          ? { ...item, is_featured: next, featured_order: nextOrder }
          : item,
      ),
    );
    const response = await fetch(`${base}/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ featured: next }),
    });
    if (!response.ok) {
      setProducts(previous);
      toast.error(t("actionError"));
      return;
    }
    const data = (await response.json().catch(() => null)) as {
      product?: CatalogProduct;
    } | null;
    if (data?.product) {
      const saved = data.product;
      setProducts((current) =>
        current.map((item) => (item.id === saved.id ? saved : item)),
      );
    }
  };

  const reorder = async (nextFeatured: CatalogProduct[]) => {
    const previous = products;
    const orderById = new Map(
      nextFeatured.map((item, index) => [item.id, index]),
    );
    setProducts((current) =>
      current.map((item) =>
        orderById.has(item.id)
          ? { ...item, featured_order: orderById.get(item.id)! }
          : item,
      ),
    );
    const response = await fetch(`${base}/featured/reorder`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nextFeatured.map((item) => item.id) }),
    });
    if (!response.ok) {
      setProducts(previous);
      toast.error(t("actionError"));
      return;
    }
    const data = (await response.json().catch(() => null)) as {
      products?: CatalogProduct[];
    } | null;
    if (data?.products) {
      setProducts(data.products);
    }
  };

  const picker = (
    <Popover open={pickerOpen} onOpenChange={setPickerOpen} modal>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8">
          <Plus className="size-4" aria-hidden />
          {t("highlights.add")}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Command>
          <CommandInput placeholder={t("highlights.addSearch")} />
          <CommandList>
            <CommandEmpty>{t("highlights.addEmpty")}</CommandEmpty>
            {others.map((product) => {
              const info = product.variant?.product;
              const meta = [
                info?.brand,
                quantityLabel(product),
                product.variant?.barcode,
              ]
                .filter((part): part is string => Boolean(part))
                .join(" · ");
              return (
                <CommandItem
                  key={product.id}
                  // Include brand + barcode so the search box matches on them too.
                  value={[
                    displayName(product),
                    info?.brand,
                    product.variant?.barcode,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onSelect={() => void setFeatured(product, true)}
                  className="gap-2.5"
                >
                  {product.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
                    <img
                      src={product.cover_image}
                      alt=""
                      className="size-9 shrink-0 rounded-md border object-cover"
                    />
                  ) : (
                    <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-md border">
                      <Package className="size-4" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{displayName(product)}</p>
                    {meta ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {meta}
                      </p>
                    ) : null}
                  </div>
                  <Plus
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                </CommandItem>
              );
            })}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-muted-foreground max-w-prose text-sm">
          {t("highlights.hint")}
        </p>
        {featured.length > 0 && others.length > 0 ? picker : null}
      </div>

      {featured.length === 0 ? (
        <div className="bg-muted/40 text-muted-foreground flex flex-col items-center gap-3 rounded-2xl p-10 text-center text-sm">
          <Star className="size-6" aria-hidden />
          {t("highlights.empty")}
          {others.length > 0 ? picker : null}
        </div>
      ) : (
        <SortableList
          items={featured}
          getId={(product) => product.id}
          onReorder={reorder}
          className="space-y-2"
          renderOverlay={(product) => (
            <div className="bg-card flex items-center gap-2 rounded-xl border p-2 shadow-lg">
              <GripVertical
                className="text-muted-foreground size-4"
                aria-hidden
              />
              <ProductLine product={product} />
            </div>
          )}
          renderItem={(product, render) => (
            <div
              ref={render.setNodeRef}
              style={render.style}
              className={cn(
                "bg-card flex items-center gap-2 rounded-xl border p-2",
                render.isDragging && "opacity-40",
              )}
            >
              <button
                ref={render.handle.ref}
                {...render.handle.attributes}
                {...render.handle.listeners}
                type="button"
                aria-label={t("highlights.reorder")}
                className="text-muted-foreground hover:text-foreground flex size-8 cursor-grab touch-none items-center justify-center rounded-md"
              >
                <GripVertical className="size-4" aria-hidden />
              </button>
              <div className="min-w-0 flex-1">
                <ProductLine product={product} />
              </div>
              <button
                type="button"
                aria-label={t("highlights.remove")}
                onClick={() => void setFeatured(product, false)}
                className="text-muted-foreground hover:text-destructive flex size-8 items-center justify-center rounded-md"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
