import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { resolveCart } = vi.hoisted(() => ({
  resolveCart: vi.fn(async (items: Array<{ perfumeVariantId: string; quantity: number }>) =>
    items.map((item) => ({
      perfumeVariantId: item.perfumeVariantId,
      requestedQuantity: item.quantity,
      name: "Santal Veil",
      sizeLabel: "50 mL",
      unitPriceMinor: 120000,
      stock: 2,
      lineAmountMinor: item.quantity * 120000,
      isValid: item.quantity <= 2,
      issue: item.quantity > 2 ? ("over-quantity" as const) : undefined,
    })),
  ),
}));
vi.mock("@/features/cart/actions/resolve-cart.action", () => ({ resolveCart }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/features/orders/client", () => ({
  Checkout: () => <form aria-label="Order details" />,
}));

import { CartPreview } from "@/features/cart";
import { CartPageContent } from "@/app/(public)/cart/_components/CartPageContent";
import { Checkout } from "@/app/(public)/checkout/_components/Checkout";
import { CartProvider, useCart } from "@/features/cart/providers/CartProvider";

beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    },
  });
  resolveCart.mockClear();
});

afterEach(cleanup);

const variantId = "55555555-5555-4555-8555-555555555555";
const invalidVariantId = "66666666-6666-4666-8666-666666666666";
function Controls() {
  const { addItem, count, removeItem } = useCart();
  return (
    <>
      <button onClick={() => addItem(variantId, 1, 2)}>Add</button>
      <button onClick={() => addItem(variantId, 2, 2)}>Add again</button>
      <button onClick={() => addItem(invalidVariantId, 3)}>Add invalid</button>
      <button onClick={() => removeItem(variantId)}>Remove</button>
      <output>{count}</output>
    </>
  );
}

describe("cart operations and presentation", () => {
  it("merges known variants without exceeding current detail stock and persists a minimal payload", async () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
    render(
      <CartProvider>
        <Controls />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add again"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("2"));
    expect(JSON.parse(store.get("jpscents.cart") ?? "{}")).toEqual({
      version: 1,
      items: [{ perfumeVariantId: variantId, quantity: 2 }],
    });
    fireEvent.click(screen.getByText("Remove"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("0"));
  });

  it("opens a Cart preview after add and supports Escape focus return", async () => {
    render(
      <CartProvider>
        <Controls />
        <CartPreview />
      </CartProvider>,
    );
    const add = screen.getByText("Add");
    add.focus();
    fireEvent.click(add);
    expect(await screen.findByRole("dialog")).toHaveTextContent("Added to cartYour cart");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(add).toHaveFocus();
  });

  it("closes the Cart preview when Checkout navigation begins", async () => {
    render(
      <CartProvider>
        <Controls />
        <CartPreview />
      </CartProvider>,
    );
    await act(async () => undefined);
    fireEvent.click(screen.getByText("Add"));
    await screen.findByText("Santal Veil");

    const checkout = screen.getByRole("link", { name: "Checkout" });
    checkout.addEventListener("click", (event) => event.preventDefault(), { once: true });
    fireEvent.click(checkout);

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("blocks Checkout for an invalid resolved cart line", async () => {
    render(
      <CartProvider>
        <Controls />
        <CartPageContent />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("Add invalid"));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute(
        "aria-disabled",
        "true",
      ),
    );
    expect(screen.getByText("Resolve unavailable items before Checkout.")).toBeInTheDocument();
  });

  it("keeps the cart surface visible while a removal refreshes availability", async () => {
    render(
      <CartProvider>
        <Controls />
        <CartPageContent />
      </CartProvider>,
    );
    await act(async () => undefined);
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(screen.getByText("Add invalid"));
    const removeButtons = await screen.findAllByRole("button", {
      name: "Remove Santal Veil from cart",
    });
    resolveCart.mockImplementationOnce(() => new Promise<never>(() => undefined));
    fireEvent.click(removeButtons[0]);

    await screen.findByText("Checking current availability…");
    expect(screen.getByRole("heading", { name: "Review your choices." })).toBeInTheDocument();
  });

  it("continues in memory when browser storage reads or writes are denied", async () => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new DOMException("Denied", "SecurityError");
        },
        setItem: () => {
          throw new DOMException("Denied", "SecurityError");
        },
      },
    });
    expect(() =>
      render(
        <CartProvider>
          <Controls />
        </CartProvider>,
      ),
    ).not.toThrow();
    expect(() => fireEvent.click(screen.getByText("Add"))).not.toThrow();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("1"));
  });
  it("updates the stepper immediately and blocks checkout while quantities are rechecked", async () => {
    render(
      <CartProvider>
        <Controls />
        <CartPageContent />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("Add"));
    await screen.findByText("Santal Veil");
    resolveCart.mockImplementationOnce(() => new Promise<never>(() => undefined));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity for Santal Veil" }));
    expect(within(screen.getByRole("article")).getByRole("status")).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(screen.getByRole("button", { name: "Decrease quantity for Santal Veil" }));
    expect(within(screen.getByRole("article")).getByRole("status")).toHaveTextContent("1");
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
  });

  it("allows retry after the initial preview lookup fails", async () => {
    resolveCart.mockRejectedValueOnce(new Error("Offline"));
    render(
      <CartProvider>
        <Controls />
        <CartPreview />
      </CartProvider>,
    );
    fireEvent.click(screen.getByText("Add"));
    fireEvent.click(await screen.findByRole("button", { name: "Retry availability check" }));
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Checkout" })).toHaveAttribute(
        "aria-disabled",
        "false",
      ),
    );
  });

  it("holds the checkout form until a restored basket passes availability checks", async () => {
    window.localStorage.setItem(
      "jpscents.cart",
      JSON.stringify({
        version: 1,
        items: [{ perfumeVariantId: variantId, quantity: 1 }],
      }),
    );
    resolveCart.mockRejectedValueOnce(new Error("Offline"));
    render(
      <CartProvider>
        <Checkout />
      </CartProvider>,
    );
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Retry availability check" }));
    expect(await screen.findByRole("form", { name: "Order details" })).toBeInTheDocument();
  });
});
