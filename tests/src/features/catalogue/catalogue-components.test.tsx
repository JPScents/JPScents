import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/catalogue/actions/bestseller.admin.action", () => ({ setBestseller: vi.fn() }));
const { savePerfume } = vi.hoisted(() => ({ savePerfume: vi.fn() }));
vi.mock("@/features/catalogue/actions/save-perfume.admin.action", () => ({ savePerfume }));
vi.mock("@/features/catalogue/actions/save-variant.admin.action", () => ({ saveVariant: vi.fn() }));
vi.mock("@/features/catalogue/actions/delete-variant.admin.action", () => ({
  deleteVariant: vi.fn(),
}));
vi.mock("@/features/catalogue/actions/save-primary-image.admin.action", () => ({
  savePrimaryImage: vi.fn(),
}));
vi.mock("@/features/catalogue/actions/remove-primary-image.admin.action", () => ({
  removePrimaryImage: vi.fn(),
}));

import { BestsellerSelector } from "@/features/catalogue/components/admin/BestsellerSelector";
import { ProductPreview } from "@/features/catalogue/components/admin/ProductPreview";
import { StagedVariantManager } from "@/features/catalogue/components/admin/StagedVariantManager";
import { PerfumeList } from "@/features/catalogue/components/admin/PerfumeList";
import { PerfumeEditor } from "@/features/catalogue/components/admin/PerfumeEditor";
import { VariantManager } from "@/features/catalogue/components/admin/VariantManager";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

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
  it("generates a slug from a new perfume name until the slug is edited", () => {
    render(<PerfumeEditor />);
    const name = screen.getByRole("textbox", { name: /Name/ });
    const slug = screen.getByRole("textbox", { name: /Slug/ });

    fireEvent.change(name, { target: { value: "Citrus Linen" } });
    expect(slug).toHaveValue("citrus-linen");

    fireEvent.change(slug, { target: { value: "citrus-linen-limited" } });
    fireEvent.change(name, { target: { value: "Citrus Linen Extrait" } });
    expect(slug).toHaveValue("citrus-linen-limited");
  });

  it("matches the Paper featured, published, and attribute controls", () => {
    render(<PerfumeEditor />);
    const featured = screen.getByRole("checkbox", { name: "Feature on homepage" });
    const published = screen.getByRole("checkbox", { name: "Published" });
    const fresh = screen.getByRole("checkbox", { name: "Fresh" });

    expect(published).toBeChecked();
    expect(screen.getByText("Help Me Choose attributes")).toBeInTheDocument();
    expect(screen.getByText("Upload image")).toBeInTheDocument();
    fireEvent.click(featured);
    fireEvent.click(published);
    fireEvent.click(fresh);
    expect(featured).toBeChecked();
    expect(published).not.toBeChecked();
    expect(fresh).toBeChecked();
  });

  it("keeps editor values after a failed submission", async () => {
    savePerfume.mockResolvedValueOnce({ errors: { form: "Unable to save this perfume." } });
    render(<PerfumeEditor />);
    const name = screen.getByRole("textbox", { name: /Name/ });
    const slug = screen.getByRole("textbox", { name: /Slug/ });
    const scentCue = screen.getByRole("textbox", { name: /Scent cue/ });
    const description = screen.getByRole("textbox", { name: /Description/ });
    const published = screen.getByRole("checkbox", { name: "Published" });
    const featured = screen.getByRole("checkbox", { name: "Feature on homepage" });
    const fresh = screen.getByRole("checkbox", { name: "Fresh" });
    const altText = screen.getByRole("textbox", { name: /Alt text/ });

    fireEvent.change(name, { target: { value: "Citrus Linen" } });
    fireEvent.change(slug, { target: { value: "citrus-linen" } });
    fireEvent.change(scentCue, { target: { value: "Bright citrus" } });
    fireEvent.change(description, { target: { value: "A clean, citrus-forward perfume." } });
    fireEvent.click(published);
    fireEvent.click(featured);
    fireEvent.click(fresh);
    fireEvent.change(altText, { target: { value: "Citrus Linen bottle" } });
    fireEvent.submit(document.getElementById("perfume-editor-form")!);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to save"));
    expect(name).toHaveValue("Citrus Linen");
    expect(slug).toHaveValue("citrus-linen");
    expect(scentCue).toHaveValue("Bright citrus");
    expect(description).toHaveValue("A clean, citrus-forward perfume.");
    await waitFor(() => {
      expect(screen.getByRole("checkbox", { name: "Published" })).not.toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Feature on homepage" })).toBeChecked();
      expect(screen.getByRole("checkbox", { name: "Fresh" })).toBeChecked();
    });
    expect(altText).toHaveValue("Citrus Linen bottle");
  });

  it("confirms a variant deletion in the app modal", () => {
    render(
      <VariantManager
        perfumeId="perfume-1"
        variants={[
          { id: "variant-1", sizeValue: { toString: () => "50" }, priceMinor: 125000, quantity: 3 },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog", { name: "Delete variant?" })).toHaveTextContent(
      "Remove the 50 mL variant. This cannot be undone.",
    );
    expect(screen.getByRole("button", { name: "Delete variant" })).toBeInTheDocument();
  });

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
