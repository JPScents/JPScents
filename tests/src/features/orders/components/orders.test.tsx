import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitOrder: vi.fn(),
  cancelOrderAdmin: vi.fn(),
  clearCart: vi.fn(),
  cart: {
    items: [{ perfumeVariantId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
    lines: [
      {
        perfumeVariantId: "11111111-1111-4111-8111-111111111111",
        requestedQuantity: 1,
        name: "Quiet Fig",
        sizeLabel: "30 mL",
        unitPriceMinor: 125000,
        lineAmountMinor: 125000,
        isValid: true,
      },
    ],
    subtotalMinor: 125000,
    hasInvalidLines: false,
  },
}));

vi.mock("@/features/orders/actions/change-order-status.admin.action", () => ({
  changeOrderStatus: vi.fn(),
}));
vi.mock("@/features/orders/actions/cancel-order.admin.action", () => ({
  cancelOrderAdmin: mocks.cancelOrderAdmin,
}));
vi.mock("@/features/orders/actions/submit-order.action", () => ({
  submitOrder: mocks.submitOrder,
  changeOrderStatus: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock("next/image", () => ({
  default: () => null,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { AdminOrderDetail, Checkout, Confirmation } from "@/features/orders/client";
import { AdminOrders } from "@/features/orders/components/AdminOrders";

const placedOrder = {
  reference: "JP-ABCDEFG",
  subtotalMinor: 125000,
  status: "AWAITING_PAYMENT" as const,
  createdAt: new Date("2026-08-28T12:00:00Z"),
  items: [
    {
      name: "Quiet Fig",
      sizeLabel: "30 mL",
      quantity: 1,
      unitPriceMinor: 125000,
      lineTotalMinor: 125000,
    },
  ],
};
const adminOrder = {
  ...placedOrder,
  legacy: false,
  customerName: "Amara Okafor",
  whatsappNumber: "2348012345678",
  email: null,
  deliveryState: "Lagos",
  deliveryCity: "Lekki",
  deliveryAddress: "12 Palm Avenue",
  orderNote: null,
  events: [],
};

describe("order presentations", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("keeps checkout submission single-flight and exposes server field errors", async () => {
    let finish: (value: { errors: Record<string, string> }) => void = () => undefined;
    mocks.submitOrder.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<Checkout cart={{ ...mocks.cart, clearCart: mocks.clearCart }} />);

    const placeOrder = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(placeOrder);
    expect(placeOrder).toBeDisabled();
    fireEvent.click(placeOrder);
    expect(mocks.submitOrder).toHaveBeenCalledTimes(1);

    finish({ errors: { customerName: "Enter your full name." } });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: /Full name/ })).toHaveAttribute(
        "aria-invalid",
        "true",
      ),
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your full name.");
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("preserves the cart and submission key when retrying after an order error", async () => {
    mocks.submitOrder.mockResolvedValue({ error: "Please try again." });
    render(<Checkout cart={{ ...mocks.cart, clearCart: mocks.clearCart }} />);

    fireEvent.change(screen.getByRole("textbox", { name: /Full name/ }), {
      target: { value: "Ada" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Please try again."));
    const key = mocks.submitOrder.mock.calls[0][2];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(await screen.findByRole("button", { name: "Place order" }));
    await waitFor(() => expect(mocks.submitOrder).toHaveBeenCalledTimes(2));
    expect(mocks.submitOrder.mock.calls[1]).toEqual([
      mocks.cart.items,
      expect.objectContaining({ customerName: "Ada" }),
      key,
    ]);
    expect(mocks.clearCart).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole("button", { name: "Place order" })).toBeEnabled());
  });

  it("recovers from a rejected submission without losing the cart or retry key", async () => {
    mocks.submitOrder
      .mockRejectedValueOnce(new Error("Network failed"))
      .mockResolvedValueOnce({ error: "Please try again." });
    render(<Checkout cart={{ ...mocks.cart, clearCart: mocks.clearCart }} />);
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Unable to place this order"),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Place order" }));
    await waitFor(() => expect(mocks.submitOrder).toHaveBeenCalledTimes(2));
    expect(mocks.submitOrder.mock.calls[1][2]).toBe(mocks.submitOrder.mock.calls[0][2]);
    expect(mocks.clearCart).not.toHaveBeenCalled();
    await screen.findByRole("button", { name: "Place order" });
  });

  it("clears the previous city and custom city when the delivery state changes", () => {
    render(<Checkout cart={{ ...mocks.cart, clearCart: mocks.clearCart }} />);
    const state = screen.getByRole("combobox", { name: "State" });
    const city = screen.getByRole("combobox", { name: "City" });
    expect(city).toBeDisabled();
    fireEvent.change(state, { target: { value: "Lagos" } });
    fireEvent.change(city, { target: { value: "OTHER" } });
    fireEvent.change(screen.getByRole("textbox", { name: /City name/ }), {
      target: { value: "Victoria Island" },
    });

    fireEvent.change(state, { target: { value: "FCT" } });
    expect(city).toHaveValue("");
    expect(screen.queryByRole("textbox", { name: /City name/ })).not.toBeInTheDocument();
    fireEvent.change(city, { target: { value: "OTHER" } });
    expect(screen.getByRole("textbox", { name: /City name/ })).toHaveValue("");
  });

  it("renders privacy-safe recovery and disables an invalid WhatsApp handoff", () => {
    const { rerender } = render(<Confirmation order={null} />);
    expect(
      screen.getByRole("heading", { name: /can’t find that order confirmation/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("JP-ABCDEFG")).not.toBeInTheDocument();

    rerender(<Confirmation order={placedOrder} businessNumber="not-configured" />);
    expect(screen.getByRole("button", { name: "WhatsApp unavailable" })).toBeDisabled();
    expect(screen.getByText("No payment has been taken online.")).toBeInTheDocument();
  });

  it("distinguishes an empty Order store from a filtered no-result", () => {
    const { rerender } = render(<AdminOrders orders={[]} />);
    expect(
      screen.getByRole("heading", { name: "No orders have been placed yet." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Clear filters" })).not.toBeInTheDocument();

    rerender(<AdminOrders orders={[]} query="missing" />);
    expect(
      screen.getByRole("heading", { name: "No orders match these filters." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute(
      "href",
      "/admin/orders",
    );
  });

  it("opens WhatsApp as JPScents following up with the customer", () => {
    render(<AdminOrderDetail order={adminOrder} />);

    const messageCustomer = screen.getByRole("link", { name: "Message customer on WhatsApp" });
    expect(screen.getByRole("option", { name: "Cancelled" })).toBeDisabled();
    expect(messageCustomer).toHaveAttribute("href", expect.stringContaining("wa.me/2348012345678"));
    expect(new URL(messageCustomer.getAttribute("href")!).searchParams.get("text")).toContain(
      "Hello Amara Okafor, this is JPScents following up on your order JP-ABCDEFG",
    );
  });

  it("requires explicit cancellation confirmation and exposes cancellation failures", async () => {
    mocks.cancelOrderAdmin.mockResolvedValue({ error: "Order not found." });
    render(<AdminOrderDetail order={adminOrder} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    expect(screen.getByRole("heading", { name: "Cancel this order?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel order" }));
    await waitFor(() => expect(mocks.cancelOrderAdmin).toHaveBeenCalledWith("JP-ABCDEFG"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Order not found."));
  });
});
