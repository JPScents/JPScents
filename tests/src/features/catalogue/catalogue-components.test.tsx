import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalogue/actions/bestseller.admin.action", () => ({ setBestseller: vi.fn() }));
vi.mock("@/features/catalogue/actions/save-perfume.admin.action", () => ({ savePerfume: vi.fn() }));
vi.mock("@/features/catalogue/actions/variants.admin.action", () => ({
  saveVariant: vi.fn(),
  deleteVariant: vi.fn(),
}));
vi.mock("@/features/catalogue/actions/image.admin.action", () => ({
  savePrimaryImage: vi.fn(),
  removePrimaryImage: vi.fn(),
}));

import { BestsellerSelector } from "@/features/catalogue/components/admin/BestsellerSelector";
import {
  ProductPreview,
  StagedVariantManager,
} from "@/features/catalogue/components/admin/PerfumeEditor";
import { PerfumeList } from "@/features/catalogue/components/admin/PerfumeList";

function StagedFixture() {
  const [variants, setVariants] = useState<
    Array<{ sizeValue: string; price: string; quantity: string }>
  >([]);
  return <StagedVariantManager variants={variants} onChange={setVariants} />;
}
function PreviewFixture() {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open preview
      </button>
      <form ref={form}>
        <input name="name" defaultValue="Quiet Fig" />
        <input name="scentCue" defaultValue="Green fig" />
      </form>
      <ProductPreview
        open={open}
        onOpenChange={setOpen}
        form={form}
        variants={[{ priceMinor: 125050, quantity: 2 }]}
      />
    </>
  );
}

describe("catalogue editor interactions", () => {
  it("stages and removes variants through ModalShell, retaining validation feedback", async () => {
    render(<StagedFixture />);
    fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
    expect(screen.getByRole("dialog", { name: "Add variant" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stage variant" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a positive size");
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "50" } });
    fireEvent.change(inputs[1], { target: { value: "1250.50" } });
    fireEvent.change(inputs[2], { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Stage variant" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByText("50 mL")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.getByText(/No variants yet/)).toBeInTheDocument();
  });

  it("opens preview, toggles its card treatment, and closes on Escape", async () => {
    render(<PreviewFixture />);
    const trigger = screen.getByRole("button", { name: "Open preview" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Product preview" });
    expect(dialog).toHaveTextContent("Quiet Fig");
    fireEvent.click(screen.getByRole("button", { name: "Show compact card" }));
    expect(screen.getByRole("button", { name: "Show large card" })).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("BestsellerSelector", () => {
  it("filters candidates and exposes current operational context and no-results feedback", () => {
    render(
      <BestsellerSelector
        currentId="fig"
        candidates={[
          {
            id: "fig",
            name: "Quiet Fig",
            scentCharacters: ["FRESH"],
            variantCount: 2,
            totalQuantity: 8,
            orderCount: 0,
          },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Choose Bestseller" }));
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText("2 variants · 8 units · 0 orders")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Search eligible perfumes" }), {
      target: { value: "amber" },
    });
    expect(screen.getByText("No eligible perfumes match this search.")).toBeInTheDocument();
  });

  it("explains the prerequisite when the catalogue has no eligible perfume", () => {
    render(<BestsellerSelector candidates={[]} />);
    expect(
      screen.getByText("Add and publish an in-stock perfume before choosing a Bestseller."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose Bestseller" })).not.toBeInTheDocument();
  });
});

describe("PerfumeList", () => {
  it("offers the first catalogue action when there are no perfumes", () => {
    render(<PerfumeList perfumes={[]} filters={{ availability: "all", placement: "all" }} />);
    expect(screen.getByRole("heading", { name: "Add the first perfume." })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Add perfume" })[0]).toHaveAttribute(
      "href",
      "/admin/perfumes/new",
    );
  });
});
