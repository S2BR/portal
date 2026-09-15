"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { useCurrentUser } from "@/components/auth/current-user";
import type { PublicCart, PublicCartItem } from "@/lib/public-business";

/**
 * Re-roll the item count + subtotal after an optimistic line change, so the UI stays consistent.
 * Only available lines count toward the totals — unavailable ones are shown but excluded (matches
 * the server's CartResource).
 */
function withTotals(cart: PublicCart, items: PublicCartItem[]): PublicCart {
  const available = items.filter((item) => item.is_available);
  return {
    ...cart,
    items,
    item_count: available.reduce((total, item) => total + item.quantity, 0),
    subtotal: available.reduce(
      (total, item) => total + (item.line_total ?? 0),
      0,
    ),
  };
}

/** The result of adding a product — so the caller can toast the right message. */
export type AddResult = "ok" | "unavailable" | "error" | "signed-out";

interface CartState {
  cart: PublicCart | null;
  /** The store's public slug, for linking to its cart/product pages. */
  slug: string;
  loading: boolean;
  /** Whether this store has e-commerce enabled AND the shopper is signed in (cart is usable). */
  ready: boolean;
  /** Whether the store has e-commerce enabled at all (controls whether cart UI shows). */
  enabled: boolean;
  /** Whether a shopper is signed in. */
  signedIn: boolean;
  add: (productId: string, quantity?: number) => Promise<AddResult>;
  setQuantity: (item: string, quantity: number) => Promise<void>;
  remove: (item: string) => Promise<void>;
  clear: () => Promise<void>;
}

const noop = async () => {};

const CartContext = createContext<CartState>({
  cart: null,
  slug: "",
  loading: false,
  ready: false,
  enabled: false,
  signedIn: false,
  add: async () => "error",
  setQuantity: noop,
  remove: noop,
  clear: noop,
});

export function useCart(): CartState {
  return useContext(CartContext);
}

/**
 * Shares one store's cart with its whole public surface (header badge/drawer, product cards, product
 * page). Loads the signed-in shopper's cart once when the store has e-commerce enabled; each mutation
 * replaces the cart with the server's fresh copy. A signed-out visitor gets `signedIn: false` so the
 * add-to-cart controls prompt a login instead.
 */
export function CartProvider({
  slug,
  enabled,
  children,
}: {
  slug: string;
  enabled: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("businesses.cart");
  const { user, loading: userLoading } = useCurrentUser();
  const signedIn = user !== null;
  const [cart, setCart] = useState<PublicCart | null>(null);
  const [loading, setLoading] = useState(false);
  const base = `/api/businesses/${encodeURIComponent(slug)}/cart`;

  // The latest cart, readable from debounced callbacks without re-creating them.
  const cartRef = useRef<PublicCart | null>(null);
  // Per-line debounce timers + a request sequence, so rapid quantity taps send ONE request for the
  // final value and a stale/superseded response can never overwrite the shown quantity.
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const seqRef = useRef(new Map<string, number>());

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, []);

  const load = useCallback(async () => {
    if (!enabled || !signedIn) {
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(base);
      if (response.ok) {
        const data = (await response.json()) as { cart: PublicCart | null };
        setCart(data.cart);
      }
    } catch {
      // Keep whatever we already show on a network hiccup.
    } finally {
      setLoading(false);
    }
  }, [base, enabled, signedIn]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const mutate = useCallback(
    async (path: string, init: RequestInit): Promise<Response> => {
      const response = await fetch(path, init);
      if (response.ok) {
        const data = (await response.json()) as { cart: PublicCart | null };
        setCart(data.cart);
      }
      return response;
    },
    [],
  );

  const add = useCallback(
    async (productId: string, quantity = 1): Promise<AddResult> => {
      if (!signedIn) {
        return "signed-out";
      }
      const response = await mutate(`${base}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity }),
      });
      if (response.ok) {
        return "ok";
      }
      return response.status === 422 ? "unavailable" : "error";
    },
    [base, mutate, signedIn],
  );

  // Optimistic + debounced quantity: instant on tap, one coalesced request per burst, stale replies
  // ignored — so rapid taps can't make the count rewind and climb back.
  const setQuantity = useCallback(
    (item: string, quantity: number): Promise<void> => {
      // Shown quantity updates on every tap instantly.
      setCart((current) =>
        current === null
          ? current
          : withTotals(
              current,
              current.items.map((line) =>
                line.id === item
                  ? {
                      ...line,
                      quantity,
                      line_total:
                        line.product.price !== null
                          ? line.product.price * quantity
                          : null,
                    }
                  : line,
              ),
            ),
      );

      // Coalesce a burst of taps into ONE request for the final value; a superseded response is
      // ignored (its seq no longer matches), so a stale reply can't rewind the count.
      const seq = (seqRef.current.get(item) ?? 0) + 1;
      seqRef.current.set(item, seq);
      const timers = timersRef.current;
      const pending = timers.get(item);
      if (pending !== undefined) {
        clearTimeout(pending);
      }
      timers.set(
        item,
        setTimeout(() => {
          timers.delete(item);
          const target =
            cartRef.current?.items.find((line) => line.id === item)?.quantity ??
            quantity;
          void (async () => {
            const response = await fetch(
              `${base}/items/${encodeURIComponent(item)}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quantity: target }),
              },
            );
            if (seqRef.current.get(item) !== seq) {
              return; // a newer tap is in flight — let it settle the truth
            }
            if (response.ok) {
              const data = (await response.json()) as {
                cart: PublicCart | null;
              };
              setCart(data.cart);
            } else {
              toast.error(t("error"));
              void load();
            }
          })();
        }, 350),
      );

      return Promise.resolve();
    },
    [base, load, t],
  );

  const remove = useCallback(
    async (item: string) => {
      // Cancel any pending quantity request for this line and supersede its response — the line's gone.
      const pending = timersRef.current.get(item);
      if (pending !== undefined) {
        clearTimeout(pending);
        timersRef.current.delete(item);
      }
      seqRef.current.set(item, (seqRef.current.get(item) ?? 0) + 1);

      let previous: PublicCart | null = null;
      setCart((current) => {
        previous = current;
        if (current === null) {
          return current;
        }
        return withTotals(
          current,
          current.items.filter((line) => line.id !== item),
        );
      });

      const response = await fetch(
        `${base}/items/${encodeURIComponent(item)}`,
        {
          method: "DELETE",
        },
      );
      if (response.ok) {
        const data = (await response.json()) as { cart: PublicCart | null };
        setCart(data.cart);
      } else {
        setCart(previous);
        toast.error(t("error"));
      }
    },
    [base, t],
  );

  const clear = useCallback(async () => {
    await mutate(base, { method: "DELETE" });
  }, [base, mutate]);

  return (
    <CartContext.Provider
      value={{
        cart,
        slug,
        loading: loading || userLoading,
        ready: enabled && signedIn,
        enabled,
        signedIn,
        add,
        setQuantity,
        remove,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
