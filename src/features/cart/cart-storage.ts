import type { CartPayload, CartRequestLine } from "./types";

const CART_VERSION = 1;
export const CART_STORAGE_KEY = "jpscents.cart";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseCartStorage(value: string | null): CartPayload {
  if (!value) return { version: CART_VERSION, items: [] };

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as { version?: unknown }).version !== CART_VERSION ||
      !Array.isArray((parsed as { items?: unknown }).items)
    ) {
      return { version: CART_VERSION, items: [] };
    }

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
      ) {
        return [];
      }
      seen.add(perfumeVariantId);
      return [{ perfumeVariantId, quantity }];
    });
    return { version: CART_VERSION, items };
  } catch {
    return { version: CART_VERSION, items: [] };
  }
}

export function readCartStorage(): CartPayload {
  try {
    return parseCartStorage(window.localStorage.getItem(CART_STORAGE_KEY));
  } catch {
    return { version: CART_VERSION, items: [] };
  }
}

export function writeCartStorage(items: CartRequestLine[]) {
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: CART_VERSION, items }));
  } catch {
    // Storage can be denied; the current basket remains usable in memory.
  }
}
