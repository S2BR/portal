import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

import { AddToCartButton } from "@/components/business/public/add-to-cart-button";
import { CatalogSectionNav } from "@/components/business/public/catalog-section-nav";
import type { PublicCatalogItem, PublicSection } from "@/lib/public-business";
import { formatMoney } from "@/lib/money";
import { unitFor } from "@/lib/products/units";
import { cn } from "@/lib/utils";

/**
 * One product tile — cover (or placeholder), name, brand · size, price. When `slug` is given the tile
 * links to the product's public page; when `commerceEnabled` is given it also carries an add-to-cart
 * button (which itself gates on the shopper being signed in).
 */
export async function PublicProductCard({
  product,
  locale,
  slug,
  commerceEnabled = false,
}: {
  product: PublicCatalogItem;
  locale: string;
  slug?: string;
  commerceEnabled?: boolean;
}) {
  const t = await getTranslations("businesses.public");
  const info = product.variant?.product;
  const outOfStock = !product.is_available;
  const quantity =
    [product.variant?.size, unitFor(product.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    product.variant?.label ||
    null;
  const price =
    product.price !== null
      ? formatMoney(product.price, product.currency, locale)
      : null;

  const body = (
    <>
      <div className="bg-muted text-muted-foreground relative flex aspect-square w-full items-center justify-center">
        {product.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
          <img
            src={product.cover_image}
            alt={info?.name ?? ""}
            className={cn(
              "size-full object-cover",
              outOfStock && "opacity-60 grayscale",
            )}
            loading="lazy"
          />
        ) : (
          <Package
            className={cn("size-6", outOfStock && "opacity-60")}
            aria-hidden
          />
        )}
        {outOfStock ? (
          <span className="bg-background/90 text-foreground absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm backdrop-blur">
            {t("outOfStock")}
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 p-3">
        <p
          className={cn(
            "truncate text-sm font-medium",
            outOfStock && "text-muted-foreground",
          )}
        >
          {info?.name ?? "—"}
        </p>
        {info?.brand || quantity ? (
          <p className="text-muted-foreground truncate text-xs">
            {[info?.brand, quantity].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {price ? <p className="text-sm tabular-nums">{price}</p> : null}
      </div>
    </>
  );

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border">
      {slug ? (
        <Link
          href={`/businesses/${slug}/products/${product.slug}`}
          className="hover:bg-muted/30 block transition-colors"
        >
          {body}
        </Link>
      ) : (
        body
      )}
      {commerceEnabled ? (
        <div className="mt-auto px-3 pb-3">
          <AddToCartButton
            productId={product.id}
            available={product.is_available}
            full
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * A business's FULL public catalog, grouped by its display sections (in order). A product in several
 * sections shows under each; products in no section fall under a localized "Other". With no sections,
 * it's a flat grid.
 */
export async function BusinessCatalog({
  products,
  sections,
  locale,
  slug,
  commerceEnabled = false,
}: {
  products: PublicCatalogItem[];
  sections: PublicSection[];
  locale: string;
  slug: string;
  commerceEnabled?: boolean;
}) {
  const t = await getTranslations("businesses.public");

  if (sections.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {products.map((product) => (
          <PublicProductCard
            key={product.id}
            product={product}
            locale={locale}
            slug={slug}
            commerceEnabled={commerceEnabled}
          />
        ))}
      </div>
    );
  }

  const grouped = sections
    .map((section) => ({
      section,
      items: products.filter((product) =>
        product.section_ids.includes(section.id),
      ),
    }))
    .filter((group) => group.items.length > 0);
  const other = products.filter((product) => product.section_ids.length === 0);

  // Jump targets for the sticky section bar — each visible group, plus "Other" when it has products.
  const navItems = [
    ...grouped.map(({ section }) => ({ id: section.id, name: section.name })),
    ...(other.length > 0 ? [{ id: "other", name: t("otherProducts") }] : []),
  ];

  return (
    <div>
      <CatalogSectionNav items={navItems} label={t("jumpToSection")} />

      <div className="space-y-10">
        {grouped.map(({ section, items }) => (
          <section
            key={section.id}
            id={`catalog-${section.id}`}
            className="scroll-mt-44"
          >
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {section.name}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {items.map((product) => (
                <PublicProductCard
                  key={`${section.id}-${product.id}`}
                  product={product}
                  locale={locale}
                  slug={slug}
                  commerceEnabled={commerceEnabled}
                />
              ))}
            </div>
          </section>
        ))}

        {other.length > 0 ? (
          <section id="catalog-other" className="scroll-mt-44">
            <h2 className="font-heading text-lg font-semibold tracking-tight">
              {t("otherProducts")}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
              {other.map((product) => (
                <PublicProductCard
                  key={product.id}
                  product={product}
                  locale={locale}
                  slug={slug}
                  commerceEnabled={commerceEnabled}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
