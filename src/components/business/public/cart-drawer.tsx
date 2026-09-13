"use client";

import { Minus, Package, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { useCart } from "@/components/business/public/cart-provider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/money";

/**
 * The store's cart: a header trigger (cart icon + item-count badge) opening a side sheet with the lines
 * — quantity steppers, remove, running subtotal. The footer links to the full cart page, where the
 * shopper reviews the order and (later) checks out. Renders nothing when the store has no e-commerce.
 */
export function CartDrawer() {
  const { enabled, signedIn, cart, slug, setQuantity, remove } = useCart();
  const t = useTranslations("businesses.cart");
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  if (!enabled) {
    return null;
  }

  const count = cart?.item_count ?? 0;
  const items = cart?.items ?? [];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={t("openCart")}
          className="border-input hover:bg-accent focus-visible:ring-ring relative inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <ShoppingCart className="size-4" />
          {t("cart")}
          {count > 0 ? (
            <span className="bg-primary text-primary-foreground absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full text-xs font-bold tabular-nums">
              {count}
            </span>
          ) : null}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetTitle className="px-1">{t("title")}</SheetTitle>
        <SheetDescription className="sr-only">{t("subtitle")}</SheetDescription>

        {!signedIn ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <ShoppingCart className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">{t("signInBody")}</p>
            <Button asChild>
              <Link href="/login">{t("signIn")}</Link>
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <ShoppingCart className="text-muted-foreground size-8" />
            <p className="text-muted-foreground text-sm">{t("empty")}</p>
          </div>
        ) : (
          <>
            <ul className="flex-1 space-y-4 overflow-y-auto px-1">
              {items.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <span className="bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                    {item.product.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element -- remote CloudFront asset
                      <img
                        src={item.product.cover_image}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <Package className="text-muted-foreground size-6" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.product.name}
                    </p>
                    {item.line_total !== null ? (
                      <p className="text-muted-foreground text-sm tabular-nums">
                        {formatMoney(
                          item.line_total,
                          item.product.currency,
                          locale,
                        )}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-md border">
                        <button
                          type="button"
                          aria-label={t("decrease")}
                          className="hover:bg-accent flex size-7 items-center justify-center rounded-l-md disabled:opacity-40"
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            void setQuantity(item.id, item.quantity - 1)
                          }
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={t("increase")}
                          className="hover:bg-accent flex size-7 items-center justify-center rounded-r-md"
                          onClick={() =>
                            void setQuantity(item.id, item.quantity + 1)
                          }
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        aria-label={t("remove")}
                        className="text-muted-foreground hover:text-destructive ms-auto flex size-7 items-center justify-center"
                        onClick={() => void remove(item.id)}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="space-y-3 border-t px-1 pt-4">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{t("subtotal")}</span>
                <span className="tabular-nums">
                  {formatMoney(
                    cart?.subtotal ?? 0,
                    cart?.currency ?? null,
                    locale,
                  )}
                </span>
              </div>
              <Button asChild className="w-full" onClick={() => setOpen(false)}>
                <Link href={`/businesses/${encodeURIComponent(slug)}/cart`}>
                  {t("viewCart")}
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
