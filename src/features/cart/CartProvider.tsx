"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { resolveCart } from "./actions/resolve-cart.action";
import { parseCartStorage } from "./parsers/cart-storage.parser";
import type { CartRequestLine, ResolvedCartLine } from "./types";

const STORAGE_KEY = "jpscents.cart";
type CartContextValue = {
  items: CartRequestLine[];
  lines: ResolvedCartLine[];
  count: number;
  subtotalMinor: number;
  hasInvalidLines: boolean;
  resolutionState: "idle" | "resolving" | "error";
  isOpen: boolean;
  addItem: (perfumeVariantId: string, quantity: number, maximumQuantity?: number) => void;
  changeQuantity: (perfumeVariantId: string, quantity: number) => void;
  removeItem: (perfumeVariantId: string) => void;
  clearCart: () => void;
  setOpen: (open: boolean) => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

function getStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
function readStoredCart() {
  try {
    return getStorage()?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
function writeStoredCart(items: CartRequestLine[]) {
  try {
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items }));
  } catch {
    /* Cart remains usable in memory. */
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartRequestLine[]>([]);
  const [lines, setLines] = useState<ResolvedCartLine[]>([]);
  const [resolutionState, setResolutionState] = useState<"idle" | "resolving" | "error">("idle");
  const [isOpen, setOpen] = useState(false);
  const persist = useCallback((next: CartRequestLine[]) => {
    setItems(next);
    writeStoredCart(next);
  }, []);
  useEffect(() => {
    queueMicrotask(() => setItems(parseCartStorage(readStoredCart()).items));
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(parseCartStorage(event.newValue).items);
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  useEffect(() => {
    let current = true;
    if (!items.length) {
      queueMicrotask(() => {
        if (current) {
          setLines([]);
          setResolutionState("idle");
        }
      });
      return () => {
        current = false;
      };
    }
    queueMicrotask(() => {
      if (current) setResolutionState("resolving");
    });
    resolveCart(items)
      .then((next) => {
        if (current) {
          setLines(next);
          setResolutionState("idle");
        }
      })
      .catch(() => {
        if (current) setResolutionState("error");
      });
    return () => {
      current = false;
    };
  }, [items]);
  const addItem = useCallback(
    (perfumeVariantId: string, quantity: number, maximumQuantity?: number) => {
      if (!perfumeVariantId || !Number.isSafeInteger(quantity) || quantity < 1) return;
      const cap =
        Number.isSafeInteger(maximumQuantity) && maximumQuantity! > 0 ? maximumQuantity : undefined;
      persist(
        items.some((item) => item.perfumeVariantId === perfumeVariantId)
          ? items.map((item) =>
              item.perfumeVariantId === perfumeVariantId
                ? {
                    ...item,
                    quantity: cap
                      ? Math.min(item.quantity + quantity, cap)
                      : item.quantity + quantity,
                  }
                : item,
            )
          : [...items, { perfumeVariantId, quantity: cap ? Math.min(quantity, cap) : quantity }],
      );
      setOpen(true);
    },
    [items, persist],
  );
  const changeQuantity = useCallback(
    (perfumeVariantId: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) return;
      persist(
        items.map((item) =>
          item.perfumeVariantId === perfumeVariantId ? { ...item, quantity } : item,
        ),
      );
    },
    [items, persist],
  );
  const removeItem = useCallback(
    (perfumeVariantId: string) =>
      persist(items.filter((item) => item.perfumeVariantId !== perfumeVariantId)),
    [items, persist],
  );
  const clearCart = useCallback(() => persist([]), [persist]);
  const value = useMemo(
    () => ({
      items,
      lines,
      count: items.reduce((total, item) => total + item.quantity, 0),
      subtotalMinor: lines.reduce((total, line) => total + line.lineAmountMinor, 0),
      hasInvalidLines:
        resolutionState !== "idle" ||
        lines.some((line) => !line.isValid) ||
        (items.length > 0 && lines.length !== items.length),
      resolutionState,
      isOpen,
      addItem,
      changeQuantity,
      removeItem,
      clearCart,
      setOpen,
    }),
    [items, lines, resolutionState, isOpen, addItem, changeQuantity, removeItem, clearCart],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used within CartProvider");
  return value;
}
