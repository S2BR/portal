import type { Metadata } from "next";
import { ArrowLeft, Package } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";

import { AddToCartButton } from "@/components/business/public/add-to-cart-button";
import {
  getCachedPublicBusiness as loadBusiness,
  getPublicBusinessProduct,
} from "@/lib/public-business";
import { formatMoney } from "@/lib/money";
import { unitFor } from "@/lib/products/units";
import { businessPagesRobots } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}): Promise<Metadata> {
  const { slug, product: productSlug } = await params;
  const [business, product] = await Promise.all([
    loadBusiness(slug),
    getPublicBusinessProduct(slug, productSlug),
  ]);

  if (!business || !product) {
    return {};
  }

  const name = product.variant?.product?.name ?? "";

  return {
    title: `${name} · ${business.name}`,
    robots: businessPagesRobots,
    alternates: {
      canonical: `/businesses/${business.slug}/products/${product.slug}`,
    },
  };
}

/**
 * A single product on a business's storefront — its image, name, price, and (when the store has
 * e-commerce enabled) an add-to-cart button. A slug that isn't publicly visible, or a product that
 * isn't one of the store's available listings, 404s.
 */
export default async function BusinessProductPage({
  params,
}: {
  params: Promise<{ slug: string; product: string }>;
}) {
  const { slug, product: productSlug } = await params;
  const business = await loadBusiness(slug);

  if (!business) {
    notFound();
  }

  if (business.slug !== slug) {
    redirect(`/businesses/${business.slug}/products/${productSlug}`);
  }

  const [locale, product, t] = await Promise.all([
    getLocale(),
    getPublicBusinessProduct(business.slug, productSlug),
    getTranslations("businesses.public"),
  ]);

  if (!product) {
    notFound();
  }

  // Canonicalize the URL to the product's current name-slug (self-healing across renames).
  if (product.slug !== productSlug) {
    redirect(`/businesses/${business.slug}/products/${product.slug}`);
  }

  const info = product.variant?.product;
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

  return (
    <div>
      <Link
        href={`/businesses/${business.slug}/products`}
        className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-4" />
        {t("products")}
      </Link>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center overflow-hidden rounded-2xl">
          {product.cover_image ? (
            // eslint-disable-next-line @next/next/no-img-element -- presigned S3 url, not a bundled asset
            <img
              src={product.cover_image}
              alt={info?.name ?? ""}
              className="size-full object-cover"
            />
          ) : (
            <Package className="size-10" aria-hidden />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {info?.name ?? "—"}
            </h1>
            {info?.brand || quantity ? (
              <p className="text-muted-foreground text-sm">
                {[info?.brand, quantity].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>

          {price ? (
            <p className="text-xl font-semibold tabular-nums">{price}</p>
          ) : null}

          <div className="pt-2">
            <AddToCartButton
              productId={product.id}
              size="lg"
              full
              withQuantity
            />
          </div>
        </div>
      </div>
    </div>
  );
}
