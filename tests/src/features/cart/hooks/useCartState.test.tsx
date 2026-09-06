import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { CartRequestLine, ResolvedCartLine } from "@/features/cart/types";

const { resolveCart } = vi.hoisted(() => ({ resolveCart: vi.fn() }));
vi.mock("@/features/cart/actions/resolve-cart.action", () => ({ resolveCart }));

import { useCartState } from "@/features/cart/hooks/useCartState";

const id = "22222222-2222-4222-8222-222222222222";
let store: Map<string, string>;
const project = (items: CartRequestLine[]): ResolvedCartLine[] =>
  items.map((item) => ({
    perfumeVariantId: item.perfumeVariantId,
    requestedQuantity: item.quantity,
    name: "Santal Veil",
    unitPriceMinor: 100,
    lineAmountMinor: item.quantity * 100,
    stock: 200,
    isValid: true,
  }));

beforeEach(() => {
  store = new Map();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  resolveCart.mockReset().mockImplementation(async (items: CartRequestLine[]) => project(items));
});
afterEach(cleanup);

describe("cart state lifecycle", () => {
  it("restores a basket without overwriting storage and gates checkout until it is checked", async () => {
    store.set(
      "jpscents.cart",
      JSON.stringify({ version: 1, items: [{ perfumeVariantId: id, quantity: 2 }] }),
    );
    let complete!: (lines: ResolvedCartLine[]) => void;
    resolveCart.mockReturnValueOnce(
      new Promise<ResolvedCartLine[]>((resolve) => {
        complete = resolve;
      }),
    );
    const { result } = renderHook(useCartState);
    expect(result.current.isHydrated).toBe(false);
    expect(result.current.resolutionState).toBe("loading");
    expect(result.current.hasInvalidLines).toBe(true);
    await waitFor(() => expect(result.current.count).toBe(2));
    expect(result.current.resolutionState).toBe("resolving");
    expect(JSON.parse(store.get("jpscents.cart")!).items).toEqual([
      { perfumeVariantId: id, quantity: 2 },
    ]);
    await act(async () => complete(project(result.current.items)));
    expect(result.current.hasInvalidLines).toBe(false);
  });

  it("accumulates batched additions and ignores stale server results after quantity changes", async () => {
    const { result } = renderHook(useCartState);
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.addItem(id, 1);
      result.current.addItem(id, 1);
    });
    await waitFor(() => expect(result.current.hasInvalidLines).toBe(false));
    expect(result.current.count).toBe(2);

    let outdated!: (lines: ResolvedCartLine[]) => void;
    let latest!: (lines: ResolvedCartLine[]) => void;
    resolveCart.mockReturnValueOnce(
      new Promise((resolve) => {
        outdated = resolve;
      }),
    );
    act(() => result.current.changeQuantity(id, 3));
    expect(result.current.lines[0].requestedQuantity).toBe(3);
    expect(result.current.hasInvalidLines).toBe(true);
    resolveCart.mockReturnValueOnce(
      new Promise((resolve) => {
        latest = resolve;
      }),
    );
    act(() => result.current.changeQuantity(id, 4));
    await act(async () => latest(project([{ perfumeVariantId: id, quantity: 4 }])));
    await act(async () => outdated(project([{ perfumeVariantId: id, quantity: 3 }])));
    expect(result.current.lines[0].requestedQuantity).toBe(4);
    expect(result.current.subtotalMinor).toBe(400);
    expect(result.current.hasInvalidLines).toBe(false);
  });

  it("keeps known items after failure, retries, and refreshes when the preview opens", async () => {
    const { result } = renderHook(useCartState);
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.addItem(id, 1));
    await waitFor(() => expect(result.current.hasInvalidLines).toBe(false));
    resolveCart.mockRejectedValueOnce(new Error("Offline"));
    act(() => result.current.refreshCart());
    await waitFor(() => expect(result.current.resolutionState).toBe("error"));
    expect(result.current.lines[0].name).toBe("Santal Veil");
    expect(result.current.hasInvalidLines).toBe(true);
    act(() => result.current.refreshCart());
    await waitFor(() => expect(result.current.hasInvalidLines).toBe(false));
    resolveCart.mockClear();
    act(() => result.current.setOpen(true));
    await waitFor(() => expect(resolveCart).toHaveBeenCalledTimes(1));
  });

  it("syncs storage events and clears persistence before checkout navigation", async () => {
    const { result } = renderHook(useCartState);
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() =>
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "jpscents.cart",
          newValue: JSON.stringify({ version: 1, items: [{ perfumeVariantId: id, quantity: 2 }] }),
        }),
      ),
    );
    await waitFor(() => expect(result.current.count).toBe(2));
    act(() => result.current.clearCart());
    expect(JSON.parse(store.get("jpscents.cart")!).items).toEqual([]);
    expect(result.current.lines).toEqual([]);
    act(() => result.current.addItem(id, 1));
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: null, newValue: null })));
    expect(result.current.count).toBe(0);
  });

  it("caps additions and edits at the order limit", async () => {
    const { result } = renderHook(useCartState);
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => result.current.addItem(id, 150, 200));
    expect(result.current.count).toBe(99);
    act(() => result.current.changeQuantity(id, 101));
    expect(result.current.count).toBe(99);
    await waitFor(() => expect(result.current.hasInvalidLines).toBe(false));
  });
});
