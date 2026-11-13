import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PublicPerfumeDetail } from "@/modules/catalogue";

const { addItem } = vi.hoisted(() => ({ addItem: vi.fn() }));
vi.mock("@/app/(public)/_cart/providers/CartProvider", () => ({ useCart: () => ({ addItem }) }));

import { VariantPurchaseControls } from "@/app/(public)/perfumes/[slug]/_components/VariantPurchaseControls";

const variants: PublicPerfumeDetail["variants"] = [
  {
    id: "one",
    sizeLabel: "30 mL",
    priceMinor: 100000,
    price: "₦1,000",
    quantity: 2,
    isAvailable: true,
  },
  {
    id: "two",
    sizeLabel: "50 mL",
    priceMinor: 200000,
    price: "₦2,000",
    quantity: 3,
    isAvailable: true,
  },
];

afterEach(() => {
  cleanup();
  addItem.mockClear();
});

describe("variant purchase controls", () => {
  it("preselects exactly one available variant and constrains quantity to stock", () => {
    render(
      <VariantPurchaseControls
        variants={[variants[0], { ...variants[1], quantity: 0, isAvailable: false }]}
      />,
    );

    expect(screen.getByRole("radio", { name: /30 mL/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: /50 mL/ })).toBeDisabled();

    const increase = screen.getByRole("button", { name: "Increase quantity" });
    const decrease = screen.getByRole("button", { name: "Decrease quantity" });
    expect(decrease).toBeDisabled();
    fireEvent.click(increase);
    expect(screen.getByRole("status")).toHaveTextContent("2");
    expect(increase).toBeDisabled();
    fireEvent.click(increase);
    expect(screen.getByRole("status")).toHaveTextContent("2");

    fireEvent.click(decrease);
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(decrease).toBeDisabled();
    fireEvent.click(decrease);
    expect(screen.getByRole("status")).toHaveTextContent("1");
  });

  it("requires a selection when several available sizes exist", () => {
    render(<VariantPurchaseControls variants={variants} />);

    const add = screen.getByRole("button", { name: "Add to Cart" });
    expect(add).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(add);
    expect(addItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("radio", { name: /50 mL/ }));
    expect(add).toBeEnabled();
    expect(screen.getByRole("radio", { name: /50 mL/ })).toBeChecked();
  });

  it("resets quantity and uses the new stock limit when the size changes", () => {
    render(<VariantPurchaseControls variants={variants} />);

    fireEvent.click(screen.getByRole("radio", { name: /50 mL/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByRole("status")).toHaveTextContent("3");

    fireEvent.click(screen.getByRole("radio", { name: /30 mL/ }));
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(screen.getByText("2 available")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeEnabled();
  });

  it("adds the selected variant with the requested quantity and stock cap", () => {
    render(<VariantPurchaseControls variants={variants} />);

    fireEvent.click(screen.getByRole("radio", { name: /50 mL/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));

    expect(addItem).toHaveBeenCalledExactlyOnceWith("two", 2, 3);
  });

  it("rechecks the selected size when current availability changes", () => {
    const { rerender } = render(<VariantPurchaseControls variants={variants} />);
    fireEvent.click(screen.getByRole("radio", { name: /50 mL/ }));
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    rerender(<VariantPurchaseControls variants={[variants[0], { ...variants[1], quantity: 1 }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Add to Cart" }));
    expect(addItem).toHaveBeenCalledWith("two", 1, 1);
    rerender(
      <VariantPurchaseControls
        variants={[variants[0], { ...variants[1], quantity: 0, isAvailable: false }]}
      />,
    );
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeDisabled();
  });

  it.each([
    { label: "no variants", variants: [] },
    {
      label: "only unavailable variants",
      variants: variants.map((variant) => ({ ...variant, quantity: 0, isAvailable: false })),
    },
  ])("prevents adding to cart with $label", ({ variants }) => {
    render(<VariantPurchaseControls variants={variants} />);

    const add = screen.getByRole("button", { name: "Add to Cart" });
    expect(add).toBeDisabled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    for (const radio of screen.queryAllByRole("radio")) {
      expect(radio).toBeDisabled();
      expect(radio).not.toBeChecked();
    }
    fireEvent.click(add);
    expect(addItem).not.toHaveBeenCalled();
  });
});
