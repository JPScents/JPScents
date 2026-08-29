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

import {
  resolveCartItems,
  type CartRequestLine,
  type ResolvedCartLine,
} from "./cart-resolver.server";

const STORAGE_KEY = "jpscents.cart";
const CART_VERSION = 1;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type CartPayload = { version: number; items: CartRequestLine[] };
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
    getStorage()?.setItem(STORAGE_KEY, JSON.stringify({ version: CART_VERSION, items }));
  } catch {
    /* Cart remains usable in memory. */
  }
}

export function parseCartPayload(value: string | null): CartPayload {
  if (!value) return { version: CART_VERSION, items: [] };
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== CART_VERSION ||
      !Array.isArray((parsed as { items?: unknown }).items)
    )
      return { version: CART_VERSION, items: [] };
    const seen = new Set<string>();
    const items = (parsed as { items: unknown[] }).items.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const { perfumeVariantId, quantity } = item as Partial<CartRequestLine>;
      if (
        typeof perfumeVariantId !== "string" ||
        !UUID_PATTERN.test(perfumeVariantId) ||
        !Number.isSafeInteger(quantity) ||
        !quantity ||
        quantity < 0 ||
        seen.has(perfumeVariantId)
      )
        return [];
      seen.add(perfumeVariantId);
      return [{ perfumeVariantId, quantity }];
    });
    return { version: CART_VERSION, items };
  } catch {
    return { version: CART_VERSION, items: [] };
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
    queueMicrotask(() => setItems(parseCartPayload(readStoredCart()).items));
  }, []);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setItems(parseCartPayload(event.newValue).items);
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
    resolveCartItems(items)
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
