"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { commerceConfig } from "@/config/commerce";

import { resolveCart } from "../actions/resolve-cart.action";
import {
  CART_STORAGE_KEY,
  parseCartStorage,
  readCartStorage,
  writeCartStorage,
} from "../storage/cart-storage";
import type { CartRequestLine, ResolvedCartLine } from "../types";

type Resolution = {
  items: CartRequestLine[];
  refreshVersion: number;
  lines: ResolvedCartLine[];
  failed: boolean;
};

export function useCartState() {
  const [items, setItems] = useState<CartRequestLine[] | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  // Event handlers need the latest basket even before React commits a batched update.
  const currentItems = useRef<CartRequestLine[] | null>(null);

  const updateItems = useCallback((update: (items: CartRequestLine[]) => CartRequestLine[]) => {
    const previous = currentItems.current ?? readCartStorage().items;
    const next = update(previous);
    currentItems.current = next;
    setItems(next);
    // Persist synchronously so checkout can clear storage before navigating away.
    writeCartStorage(next);
  }, []);

  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (!mounted || currentItems.current !== null) {
        return;
      }
      const restored = readCartStorage().items;
      currentItems.current = restored;
      setItems(restored);
    });

    const sync = (event: StorageEvent) => {
      if (event.key !== CART_STORAGE_KEY && event.key !== null) {
        return;
      }
      const next = parseCartStorage(event.newValue).items;
      currentItems.current = next;
      setItems(next);
    };
    window.addEventListener("storage", sync);
    return () => {
      mounted = false;
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!items?.length) {
      return;
    }
    let current = true;
    resolveCart(items)
      .then((lines) => {
        if (current && currentItems.current === items) {
          setResolution({ items, refreshVersion, lines, failed: false });
        }
      })
      .catch(() => {
        if (current && currentItems.current === items) {
          setResolution((previous) => ({
            items,
            refreshVersion,
            lines: previous?.lines ?? [],
            failed: true,
          }));
        }
      });
    return () => {
      current = false;
    };
  }, [items, refreshVersion]);

  const refreshCart = useCallback(() => setRefreshVersion((version) => version + 1), []);
  const setOpen = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        refreshCart();
      }
    },
    [refreshCart],
  );

  const addItem = useCallback(
    (perfumeVariantId: string, quantity: number, maximumQuantity?: number) => {
      if (!perfumeVariantId || !Number.isSafeInteger(quantity) || quantity < 1) {
        return;
      }
      if (
        maximumQuantity !== undefined &&
        (!Number.isSafeInteger(maximumQuantity) || maximumQuantity < 1)
      ) {
        return;
      }
      const maximum = Math.min(
        maximumQuantity ?? commerceConfig.maximumVariantQuantity,
        commerceConfig.maximumVariantQuantity,
      );
      updateItems((previous) => {
        const existing = previous.find((item) => item.perfumeVariantId === perfumeVariantId);
        const nextQuantity = Math.min((existing?.quantity ?? 0) + quantity, maximum);
        return existing
          ? previous.map((item) =>
              item.perfumeVariantId === perfumeVariantId
                ? { ...item, quantity: nextQuantity }
                : item,
            )
          : [...previous, { perfumeVariantId, quantity: nextQuantity }];
      });
      setIsOpen(true);
    },
    [updateItems],
  );

  const changeQuantity = useCallback(
    (perfumeVariantId: string, quantity: number) => {
      if (!Number.isSafeInteger(quantity) || quantity < 1) {
        return;
      }
      updateItems((previous) =>
        previous.map((item) =>
          item.perfumeVariantId === perfumeVariantId
            ? { ...item, quantity: Math.min(quantity, commerceConfig.maximumVariantQuantity) }
            : item,
        ),
      );
    },
    [updateItems],
  );

  const removeItem = useCallback(
    (perfumeVariantId: string) => {
      updateItems((previous) =>
        previous.filter((item) => item.perfumeVariantId !== perfumeVariantId),
      );
    },
    [updateItems],
  );
  const clearCart = useCallback(() => updateItems(() => []), [updateItems]);
  const removePurchasedItems = useCallback(
    (purchased: CartRequestLine[]) => {
      const paid = new Map(purchased.map((item) => [item.perfumeVariantId, item.quantity]));
      updateItems((previous) =>
        previous.flatMap((item) => {
          const quantity = item.quantity - (paid.get(item.perfumeVariantId) ?? 0);
          return quantity > 0 ? [{ ...item, quantity }] : [];
        }),
      );
    },
    [updateItems],
  );

  const isHydrated = items !== null;
  const requestedItems = items ?? [];
  const isCurrent = resolution?.items === items && resolution?.refreshVersion === refreshVersion;
  let resolutionState: "loading" | "idle" | "resolving" | "error" = "idle";
  if (!isHydrated) {
    resolutionState = "loading";
  } else if (requestedItems.length) {
    if (!isCurrent) {
      resolutionState = "resolving";
    } else if (resolution?.failed) {
      resolutionState = "error";
    }
  }
  const byId = new Map(resolution?.lines.map((line) => [line.perfumeVariantId, line]));
  // Keep known product details while checking, but display current requested quantities.
  const lines = requestedItems.flatMap((item) => {
    const line = byId.get(item.perfumeVariantId);
    if (!line) {
      return [];
    }
    return [
      {
        ...line,
        requestedQuantity: item.quantity,
        lineAmountMinor: line.isValid ? (line.unitPriceMinor ?? 0) * item.quantity : 0,
      },
    ];
  });
  const hasInvalidLines =
    resolutionState !== "idle" ||
    !requestedItems.length ||
    lines.length !== requestedItems.length ||
    lines.some((line) => !line.isValid);

  return {
    items: requestedItems,
    lines,
    isHydrated,
    count: requestedItems.reduce((total, item) => total + item.quantity, 0),
    subtotalMinor: lines.reduce((total, line) => total + line.lineAmountMinor, 0),
    hasInvalidLines,
    resolutionState,
    isOpen,
    addItem,
    changeQuantity,
    removeItem,
    clearCart,
    removePurchasedItems,
    setOpen,
    refreshCart,
  };
}
