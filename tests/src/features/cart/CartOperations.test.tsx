import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { resolveCartItems } = vi.hoisted(() => ({ resolveCartItems: vi.fn(async (items: Array<{ perfumeVariantId: string; quantity: number }>) => items.map((item) => ({ ...item, name: "Santal Veil", sizeLabel: "50 mL", unitPriceMinor: 120000, stock: 2, lineAmountMinor: item.quantity * 120000, isValid: item.quantity <= 2, issue: item.quantity > 2 ? "over-quantity" as const : undefined }))) }));
vi.mock("@/features/cart/cart-resolver.server", () => ({ resolveCartItems }));
vi.mock("next/link", () => ({ default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a> }));

import { CartPreview, FullCart } from "@/features/cart";
import { CartProvider, useCart } from "@/features/cart/CartProvider";

afterEach(cleanup);

const variantId = "55555555-5555-4555-8555-555555555555";
const invalidVariantId = "66666666-6666-4666-8666-666666666666";
function Controls() { const { addItem, count, removeItem } = useCart(); return <><button onClick={() => addItem(variantId, 1, 2)}>Add</button><button onClick={() => addItem(variantId, 2, 2)}>Add again</button><button onClick={() => addItem(invalidVariantId, 3)}>Add invalid</button><button onClick={() => removeItem(variantId)}>Remove</button><output>{count}</output></>; }

describe("cart operations and presentation", () => {
  it("merges known variants without exceeding current detail stock and persists a minimal payload", async () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => store.set(key, value) } });
    render(<CartProvider><Controls /></CartProvider>);
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add again"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2"));
    expect(JSON.parse(store.get("jpscents.cart") ?? "{}")).toEqual({ version: 1, items: [{ perfumeVariantId: variantId, quantity: 2 }] });
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0"));
  });

  it("opens a Cart preview after add and supports Escape focus return", async () => {
    render(<CartProvider><Controls /><CartPreview /></CartProvider>);
    const add = screen.getByText("Add"); add.focus(); fireEvent.click(add);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Added to cartYour cart");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(add).toHaveFocus();
  });

  it("blocks Checkout for an invalid resolved cart line", async () => {
    render(<CartProvider><Controls /><FullCart /></CartProvider>);
    fireEvent.click(screen.getByText("Add invalid"));
    await waitFor(() => expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("aria-disabled", "true"));
    expect(screen.getByText("Resolve unavailable items before Checkout.")).toBeInTheDocument();
  });

  it("continues in memory when browser storage reads or writes are denied", async () => {
    Object.defineProperty(window, "localStorage", { configurable: true, value: { getItem: () => { throw new DOMException("Denied", "SecurityError"); }, setItem: () => { throw new DOMException("Denied", "SecurityError"); } } });
    expect(() => render(<CartProvider><Controls /></CartProvider>)).not.toThrow();
    expect(() => fireEvent.click(screen.getByText("Add"))).not.toThrow();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1"));
  });

});
