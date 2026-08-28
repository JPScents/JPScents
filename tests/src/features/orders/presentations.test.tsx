import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  submitOrder: vi.fn(),
  clearCart: vi.fn(),
  cart: {
    items: [{ perfumeVariantId: "11111111-1111-4111-8111-111111111111", quantity: 1 }],
    lines: [{
      perfumeVariantId: "11111111-1111-4111-8111-111111111111",
      requestedQuantity: 1,
      name: "Quiet Fig",
      sizeLabel: "30 mL",
      unitPriceMinor: 125000,
      lineAmountMinor: 125000,
      isValid: true,
    }],
    subtotalMinor: 125000,
    hasInvalidLines: false,
  },
}));

vi.mock("@/features/cart", () => ({
  useCart: () => ({ ...mocks.cart, clearCart: mocks.clearCart }),
}));
vi.mock("@/features/orders/actions", () => ({
  submitOrder: mocks.submitOrder,
  changeOrderStatus: vi.fn(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...props}>{children}</a>,
}));
vi.mock("next/image", () => ({
  default: () => null,
}));

import { Checkout, Confirmation } from "@/features/orders/presentations";

const placedOrder = {
  reference: "JP-ABCDEFG",
  subtotalMinor: 125000,
  status: "NEW",
  createdAt: new Date("2026-08-28T12:00:00Z"),
  items: [{
    name: "Quiet Fig",
    sizeLabel: "30 mL",
    quantity: 1,
    unitPriceMinor: 125000,
    lineTotalMinor: 125000,
  }],
};

describe("order presentations", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("keeps checkout submission single-flight and exposes server field errors", async () => {
    let finish: (value: { errors: Record<string, string> }) => void = () => undefined;
    mocks.submitOrder.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    render(<Checkout />);

    const placeOrder = screen.getByRole("button", { name: "Place order" });
    fireEvent.click(placeOrder);
    expect(placeOrder).toBeDisabled();
    fireEvent.click(placeOrder);
    expect(mocks.submitOrder).toHaveBeenCalledTimes(1);

    finish({ errors: { customerName: "Enter your full name." } });
    await waitFor(() => expect(screen.getByRole("textbox", { name: /Full name/ })).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter your full name.");
    expect(mocks.clearCart).not.toHaveBeenCalled();
  });

  it("renders privacy-safe recovery and disables an invalid WhatsApp handoff", () => {
    const { rerender } = render(<Confirmation order={null} />);
    expect(screen.getByRole("heading", { name: /can’t find that order confirmation/i })).toBeInTheDocument();
    expect(screen.queryByText("JP-ABCDEFG")).not.toBeInTheDocument();

    rerender(<Confirmation order={placedOrder} businessNumber="not-configured" />);
    expect(screen.getByRole("button", { name: "WhatsApp unavailable" })).toBeDisabled();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText("No payment has been taken online.")).toBeInTheDocument();
    expect(screen.getByLabelText("Perfume bottle placeholder")).toBeInTheDocument();
  });
});
