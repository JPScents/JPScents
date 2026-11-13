import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/(admin)/admin/_actions/bestseller.admin.action", () => ({ setBestseller: vi.fn() }));
const { savePerfume, deleteVariant } = vi.hoisted(() => ({
  savePerfume: vi.fn(),
  deleteVariant: vi.fn(),
}));
vi.mock("@/app/(admin)/admin/perfumes/_actions/save-perfume.admin.action", () => ({ savePerfume }));
vi.mock("@/app/(admin)/admin/perfumes/_actions/save-variant.admin.action", () => ({
  saveVariant: vi.fn(),
}));
vi.mock("@/app/(admin)/admin/perfumes/_actions/delete-variant.admin.action", () => ({
  deleteVariant,
}));
vi.mock("@/app/(admin)/admin/perfumes/_actions/save-primary-image.admin.action", () => ({
  savePrimaryImage: vi.fn(),
}));
vi.mock("@/app/(admin)/admin/perfumes/_actions/remove-primary-image.admin.action", () => ({
  removePrimaryImage: vi.fn(),
}));

import { BestsellerSelector } from "@/app/(admin)/admin/_components/BestsellerSelector";
import { StagedVariantManager } from "@/app/(admin)/admin/perfumes/_components/StagedVariantManager";
import { PerfumeEditor } from "@/app/(admin)/admin/perfumes/_components/PerfumeEditor";
import { VariantManager } from "@/app/(admin)/admin/perfumes/_components/VariantManager";

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

  it("only deletes the selected variant after confirmation and allows cancellation", async () => {
    deleteVariant.mockResolvedValueOnce({ ok: true });
    render(
      <VariantManager
        perfumeId="perfume-1"
        variants={[
          { id: "variant-1", sizeValue: "50", sizeUnit: "ML", priceMinor: 125000, quantity: 3 },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(deleteVariant).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteVariant).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete variant" }));
    await waitFor(() => expect(deleteVariant).toHaveBeenCalledTimes(1));
    const formData = deleteVariant.mock.calls[0][1] as FormData;
    expect(formData.get("id")).toBe("variant-1");
    expect(formData.get("perfumeId")).toBe("perfume-1");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
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

  it("rejects equivalent staged sizes before the form is submitted", async () => {
    render(<StagedFixture />);
    const stage = (sizeValue: string) => {
      fireEvent.click(screen.getByRole("button", { name: "Add variant" }));
      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[0], { target: { value: sizeValue } });
      fireEvent.change(inputs[1], { target: { value: "1250" } });
      fireEvent.change(inputs[2], { target: { value: "2" } });
      fireEvent.click(screen.getByRole("button", { name: "Stage variant" }));
    };

    stage("50");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    stage("50.0");

    expect(screen.getByRole("alert")).toHaveTextContent("Each staged variant needs a unique size.");
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
