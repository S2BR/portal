"use client";

import { LoaderCircle, Minus, Plus, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/business/public/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_QUANTITY = 999;

/**
 * Adds a product (by its public id) to the store's cart. Renders nothing when the store has no
 * e-commerce; prompts a sign-in when the shopper is signed out; otherwise adds and toasts the result.
 * With `withQuantity` (the product page) it shows a quantity stepper and adds that many; otherwise it's
 * a plain one-tap add (product cards). `preventDefault`/`stopPropagation` so it works inside a card link.
 */
export function AddToCartButton({
  productId,
  className,
  size = "sm",
  full = false,
  withQuantity = false,
}: {
  productId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  full?: boolean;
  withQuantity?: boolean;
}) {
  const { enabled, signedIn, add } = useCart();
  const t = useTranslations("businesses.cart");
  const [busy, setBusy] = useState(false);
  const [quantity, setQuantity] = useState(1);

  if (!enabled) {
    return null;
  }

  if (!signedIn) {
    return (
      <Button
        asChild
        variant="outline"
        size={size}
        className={cn(full && "w-full", className)}
      >
        <Link href="/login">
          <ShoppingCart className="size-4" />
          {t("signInToAdd")}
        </Link>
      </Button>
    );
  }

  async function onAdd(event: React.MouseEvent) {
    // Inside a product-card link: don't navigate when the button is tapped.
    event.preventDefault();
    event.stopPropagation();
    setBusy(true);
    const result = await add(productId, withQuantity ? quantity : 1);
    setBusy(false);
    if (result === "ok") {
      toast.success(t("added"));
      setQuantity(1);
    } else if (result === "unavailable") {
      toast.error(t("unavailable"));
    } else if (result !== "signed-out") {
      toast.error(t("error"));
    }
  }

  const addButton = (
    <Button
      type="button"
      size={size}
      disabled={busy}
      className={cn(full && (withQuantity ? "flex-1" : "w-full"), className)}
      onClick={onAdd}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      {t("add")}
    </Button>
  );

  if (!withQuantity) {
    return addButton;
  }

  return (
    <div className={cn("flex items-center gap-3", full && "w-full")}>
      <div className="flex h-10 items-center rounded-md border">
        <button
          type="button"
          aria-label={t("decrease")}
          disabled={busy || quantity <= 1}
          onClick={() => setQuantity((current) => Math.max(1, current - 1))}
          className="hover:bg-accent flex size-10 items-center justify-center rounded-l-md disabled:opacity-40"
        >
          <Minus className="size-4" />
        </button>
        <span
          aria-label={t("quantity")}
          aria-live="polite"
          className="w-10 text-center text-sm tabular-nums"
        >
          {quantity}
        </span>
        <button
          type="button"
          aria-label={t("increase")}
          disabled={busy || quantity >= MAX_QUANTITY}
          onClick={() =>
            setQuantity((current) => Math.min(MAX_QUANTITY, current + 1))
          }
          className="hover:bg-accent flex size-10 items-center justify-center rounded-r-md disabled:opacity-40"
        >
          <Plus className="size-4" />
        </button>
      </div>
      {addButton}
    </div>
  );
}
