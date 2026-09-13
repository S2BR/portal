"use client";

import {
  ArrowLeft,
  Minus,
  Package,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

import { useCart } from "@/components/business/public/cart-provider";
import type { PublicCartItem } from "@/lib/public-business";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { unitFor } from "@/lib/products/units";

/** A cart line's short quantity label (size + unit, or the variant label). */
function variantLabel(item: PublicCartItem): string | null {
  const variant = item.product.variant;
  return (
    [variant?.size, unitFor(variant?.unit)?.symbol]
      .filter((part): part is string => Boolean(part))
      .join(" ") ||
    variant?.label ||
    null
  );
}

/** One editable cart row — cover, name, unit price, quantity stepper, remove, line total. */
function CartRow({
  item,
  locale,
  t,
}: {
  item: PublicCartItem;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const { setQuantity, remove } = useCart();
  const label = variantLabel(item);
  return (
    <li className="flex gap-4 py-4">
      <span className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl">
        {item.product.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote CloudFront asset
          <img
            src={item.product.cover_image}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <Package className="text-muted-foreground size-7" />
        )}
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{item.product.name}</p>
            {label ? (
              <p className="text-muted-foreground text-sm">{label}</p>
            ) : null}
            {item.product.price !== null ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                {formatMoney(item.product.price, item.product.currency, locale)}
              </p>
            ) : null}
          </div>
          {item.line_total !== null ? (
            <p className="shrink-0 font-semibold tabular-nums">
              {formatMoney(item.line_total, item.product.currency, locale)}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <button
              type="button"
              aria-label={t("decrease")}
              className="hover:bg-accent flex size-8 items-center justify-center rounded-l-md disabled:opacity-40"
              disabled={item.quantity <= 1}
              onClick={() => void setQuantity(item.id, item.quantity - 1)}
            >
              <Minus className="size-3.5" />
            </button>
            <span className="w-9 text-center text-sm tabular-nums">
              {item.quantity}
            </span>
            <button
              type="button"
              aria-label={t("increase")}
              className="hover:bg-accent flex size-8 items-center justify-center rounded-r-md"
              onClick={() => void setQuantity(item.id, item.quantity + 1)}
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            aria-label={t("remove")}
            className="text-muted-foreground hover:text-destructive ms-auto flex size-8 items-center justify-center"
            onClick={() => void remove(item.id)}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}

/**
 * The store's full cart page: review every line (adjust quantity, remove), see the running total, and
 * jump back to keep shopping. The order summary hosts the checkout action — payment isn't built yet, so
 * that button is a placeholder for the delivery-details + checkout step coming next.
 */
export function StoreCart() {
  const { cart, slug, loading, signedIn } = useCart();
  const t = useTranslations("businesses.cart");
  const locale = useLocale();

  const productsHref = `/businesses/${encodeURIComponent(slug)}/products`;
  const items = cart?.items ?? [];

  const backToShopping = (
    <Link
      href={productsHref}
      className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm"
    >
      <ArrowLeft className="size-4" />
      {t("continueShopping")}
    </Link>
  );

  if (loading && cart === null) {
    return (
      <div>
        {backToShopping}
        <div className="text-muted-foreground py-16 text-center text-sm">
          {t("title")}…
        </div>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div>
        {backToShopping}
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <ShoppingCart className="text-muted-foreground size-9" />
          <p className="text-muted-foreground">{t("signInBody")}</p>
          <Button asChild>
            <Link href="/login">{t("signIn")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        {backToShopping}
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <ShoppingCart className="text-muted-foreground size-9" />
          <p className="text-muted-foreground">{t("empty")}</p>
          <Button asChild variant="outline">
            <Link href={productsHref}>{t("continueShopping")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {backToShopping}
      <h1 className="font-heading mb-6 text-2xl font-semibold tracking-tight">
        {t("title")}
      </h1>

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="divide-y">
          {items.map((item) => (
            <CartRow key={item.id} item={item} locale={locale} t={t} />
          ))}
        </ul>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="bg-card space-y-4 rounded-2xl border p-5">
            <h2 className="font-semibold">{t("summary")}</h2>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("itemCount", { count: cart?.item_count ?? 0 })}
              </span>
              <span className="font-medium tabular-nums">
                {formatMoney(
                  cart?.subtotal ?? 0,
                  cart?.currency ?? null,
                  locale,
                )}
              </span>
            </div>
            <div className="flex items-center justify-between border-t pt-4 font-semibold">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">
                {formatMoney(
                  cart?.subtotal ?? 0,
                  cart?.currency ?? null,
                  locale,
                )}
              </span>
            </div>
            <Button className="w-full" disabled>
              {t("checkoutSoon")}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              {t("checkoutNote")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
