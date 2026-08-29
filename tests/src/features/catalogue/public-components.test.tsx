import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/image", () => ({
  default: ({ alt }: { alt?: string }) => <span data-image-alt={alt} />,
}));

import { VariantPurchaseControls } from "@/features/catalogue/components/public/PublicControls";
import { ScentCharacterSelect } from "@/features/catalogue/components/public/ScentCharacterSelect";
import { HelpMeChoose } from "@/features/catalogue/components/public/HelpMeChoose";
import { CatalogueProductCard } from "@/features/catalogue/components/public/CatalogueProductCard";

afterEach(cleanup);

describe("public catalogue controls", () => {
  it("preselects exactly one available variant and constrains quantity to stock", () => {
    render(
      <VariantPurchaseControls
        onAddItem={vi.fn()}
        variants={[
          { id: "one", sizeLabel: "30 mL", price: "₦1,000", quantity: 2, isAvailable: true },
          { id: "two", sizeLabel: "50 mL", price: "₦2,000", quantity: 0, isAvailable: false },
        ]}
      />,
    );
    expect(screen.getByRole("radio", { name: /30 mL/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByRole("status")).toHaveTextContent("2");
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /50 mL/ })).toBeDisabled();
  });

  it("requires a selection when several available sizes exist", () => {
    render(
      <VariantPurchaseControls
        onAddItem={vi.fn()}
        variants={[
          { id: "one", sizeLabel: "30 mL", price: "₦1,000", quantity: 2, isAvailable: true },
          { id: "two", sizeLabel: "50 mL", price: "₦2,000", quantity: 3, isAvailable: true },
        ]}
      />,
    );
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeDisabled();
    fireEvent.click(screen.getByRole("radio", { name: /50 mL/ }));
    expect(screen.getByRole("button", { name: "Add to Cart" })).toBeEnabled();
  });

  it("exposes selected scent character state programmatically", () => {
    const toggle = vi.fn();
    render(<ScentCharacterSelect value="FRESH" selected onToggle={toggle} />);
    const button = screen.getByRole("button", { name: "Fresh" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalledWith("FRESH");
  });

  it("uses friendly preference labels and exposes the results announcement and no-match recovery", () => {
    render(
      <HelpMeChoose
        initial={{ scentCharacters: ["FRESH"], occasions: ["DATE_NIGHT"], timeOfDay: "NIGHT" }}
        submitted
        results={[]}
      />,
    );
    expect(screen.getByText("Fresh · Evening · Night")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "No exact match yet." })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Adjust preferences" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Browse all perfumes" })).toHaveAttribute(
      "href",
      "/perfumes",
    );
    expect(screen.getByRole("heading", { name: /Perfumes chosen around/ })).toHaveFocus();
  });

  it("does not offer recommendations before an available catalogue exists", () => {
    render(
      <HelpMeChoose
        initial={{ scentCharacters: [], occasions: [] }}
        submitted={false}
        catalogueAvailable={false}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Recommendations will begin with the collection." }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Recommend perfumes" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return home" })).toHaveAttribute("href", "/");
  });

  it("renders a controlled bottle fallback when a product image is unavailable", () => {
    render(
      <CatalogueProductCard
        perfume={{
          id: "p",
          slug: "quiet-fig",
          name: "Quiet Fig",
          scentCue: "Fresh fig",
          scentCharacters: ["FRESH"],
          primaryImageAlt: "",
          startingPrice: "From ₦1,000",
          isAvailable: true,
        }}
      />,
    );
    expect(screen.getByLabelText("Perfume bottle placeholder")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Quiet Fig/ })).toHaveAttribute(
      "href",
      "/perfume/quiet-fig",
    );
  });
});
