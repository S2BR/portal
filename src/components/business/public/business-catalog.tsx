import { Package } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { PublicCatalogItem, PublicSection } from "@/lib/public-business";
import { unitFor } from "@/lib/products/units";

/** One product tile — cover (or placeholder), name, brand · size, price. Locale-agnostic markup. */
export function PublicProductCard({
  product,
  locale,
}: {
  product: PublicCatalogItem;
  locale: string;
}) {
  const info = product.variant?.product;
  const quantity =
    [product.variant?.size, unitFor(product.variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    product.variant?.label ||
    null;
  const price =
    product.price !== null
      ? new Intl.NumberFormat(locale, {
          style: "currency",
          currency: product.currency ?? "BRL",
        }).format(product.price / 100)
      : null;

  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="bg-muted text-muted-foreground flex aspect-square w-full items-center justify-center">
        {product.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
          <img
            src={product.cover_image}
            alt={info?.name ?? ""}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <Package className="size-6" aria-hidden />
        )}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="truncate text-sm font-medium">{info?.name ?? "—"}</p>
        {info?.brand || quantity ? (
          <p className="text-muted-foreground truncate text-xs">
            {[info?.brand, quantity].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        {price ? <p className="text-sm tabular-nums">{price}</p> : null}
      </div>
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
}: {
  products: PublicCatalogItem[];
  sections: PublicSection[];
  locale: string;
}) {
  const t = await getTranslations("businesses.public");

  if (sections.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <PublicProductCard
            key={product.id}
            product={product}
            locale={locale}
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

  return (
    <div className="space-y-10">
      {grouped.map(({ section, items }) => (
        <section key={section.id}>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {section.name}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((product) => (
              <PublicProductCard
                key={`${section.id}-${product.id}`}
                product={product}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ))}

      {other.length > 0 ? (
        <section>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            {t("otherProducts")}
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {other.map((product) => (
              <PublicProductCard
                key={product.id}
                product={product}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
