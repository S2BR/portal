"use client";

import { LoaderCircle, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/business/public/cart-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Adds a product (by its public id) to the store's cart. Renders nothing when the store has no
 * e-commerce; prompts a sign-in when the shopper is signed out; otherwise adds and toasts the result.
 * `preventDefault`/`stopPropagation` so it works even inside a product-card link.
 */
export function AddToCartButton({
  productId,
  className,
  size = "sm",
  full = false,
}: {
  productId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  full?: boolean;
}) {
  const { enabled, signedIn, add } = useCart();
  const t = useTranslations("businesses.cart");
  const [busy, setBusy] = useState(false);

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

  return (
    <Button
      type="button"
      size={size}
      disabled={busy}
      className={cn(full && "w-full", className)}
      onClick={async (event) => {
        // Inside a product-card link: don't navigate when the button is tapped.
        event.preventDefault();
        event.stopPropagation();
        setBusy(true);
        const result = await add(productId);
        setBusy(false);
        if (result === "ok") {
          toast.success(t("added"));
        } else if (result === "unavailable") {
          toast.error(t("unavailable"));
        } else if (result !== "signed-out") {
          toast.error(t("error"));
        }
      }}
    >
      {busy ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : (
        <ShoppingCart className="size-4" />
      )}
      {t("add")}
    </Button>
  );
}
