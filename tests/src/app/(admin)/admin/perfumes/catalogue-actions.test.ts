import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  findPerfume: vi.fn(),
  getCurrentAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/app/_server/admin-session", () => ({
  getCurrentAdmin: mocks.getCurrentAdmin,
}));
vi.mock("@/app/_server/supabase-session", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: { perfume: { findUnique: mocks.findPerfume }, $transaction: mocks.transaction },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { setBestseller } from "@/app/(admin)/admin/_actions/bestseller.admin.action";
import { removePrimaryImage } from "@/app/(admin)/admin/perfumes/_actions/remove-primary-image.admin.action";
import { savePrimaryImage } from "@/app/(admin)/admin/perfumes/_actions/save-primary-image.admin.action";
import { savePerfume } from "@/app/(admin)/admin/perfumes/_actions/save-perfume.admin.action";
import { deleteVariant } from "@/app/(admin)/admin/perfumes/_actions/delete-variant.admin.action";
import { saveVariant } from "@/app/(admin)/admin/perfumes/_actions/save-variant.admin.action";
import { validateImageInput } from "@/modules/catalogue/validators/image.validator";

function publishedPerfumeForm(quantity: number) {
  const form = new FormData();
  form.set("name", "Amber");
  form.set("slug", "amber");
  form.set("scentCue", "Soft amber");
  form.set("description", "An amber perfume.");
  form.set("status", "PUBLISHED");
  form.set("scentCharacters", "WARM");
  form.set("occasions", "EVERYDAY");
  form.set("timesOfDay", "DAY");
  form.set("stagedVariants", JSON.stringify([{ sizeValue: "30", price: "1000", quantity }]));
  form.set("primaryImage", new File(["image"], "bottle.webp", { type: "image/webp" }));
  form.set("primaryImageAlt", "Amber bottle");
  return form;
}

describe("catalogue mutation boundaries", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getCurrentAdmin.mockResolvedValue(null);
  });

  it("rejects every catalogue mutation before database or storage work", async () => {
    const formData = new FormData();

    await expect(savePerfume({}, formData)).resolves.toEqual({
      message: "You are not authorized to manage the catalogue.",
    });
    await expect(saveVariant({}, formData)).resolves.toEqual({
      message: "You are not authorized to manage variants.",
    });
    await expect(deleteVariant({}, formData)).resolves.toEqual({
      message: "You are not authorized to manage variants.",
    });
    await expect(savePrimaryImage({}, formData)).resolves.toEqual({
      error: "You are not authorized to manage images.",
    });
    await expect(removePrimaryImage({}, formData)).resolves.toEqual({
      error: "You are not authorized to manage images.",
    });
    await expect(setBestseller("perfume-id")).resolves.toEqual({
      error: "You are not authorized.",
    });

    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("validates image type, size, and alt text before upload", () => {
    const valid = new File(["image"], "bottle.webp", { type: "image/webp" });
    const invalidType = new File(["image"], "bottle.gif", { type: "image/gif" });

    expect(validateImageInput(valid, "Amber bottle")).toBeUndefined();
    expect(validateImageInput(valid, "")).toBe("Useful alt text is required.");
    expect(validateImageInput(invalidType, "Amber bottle")).toBe(
      "Use JPEG, PNG, or WebP up to 5 MiB.",
    );
  });

  it("reports a duplicate slug before attempting any Storage work", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    mocks.findPerfume.mockResolvedValue({ id: "existing-perfume" });
    mocks.createSupabaseServerClient.mockRejectedValue(new Error("Storage unavailable"));

    await expect(savePerfume({}, publishedPerfumeForm(1))).resolves.toEqual({
      errors: { slug: "That slug is already in use." },
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("reports missing stock before uploading an image for a published perfume", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    mocks.findPerfume.mockResolvedValue(null);
    mocks.createSupabaseServerClient.mockRejectedValue(new Error("Storage unavailable"));

    await expect(savePerfume({}, publishedPerfumeForm(0))).resolves.toEqual({
      errors: { form: "Publishing requires an in-stock, priced variant." },
    });
    expect(mocks.createSupabaseServerClient).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rechecks the slug in the transaction and removes the upload if it was claimed", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    mocks.findPerfume.mockResolvedValue(null);
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    mocks.createSupabaseServerClient.mockResolvedValue({
      storage: { from: vi.fn().mockReturnValue({ upload, remove }) },
    });
    const tx = {
      perfume: {
        findUnique: vi.fn().mockResolvedValue({ id: "concurrent-perfume" }),
        create: vi.fn(),
      },
    };
    mocks.transaction.mockImplementation((save: (client: typeof tx) => Promise<unknown>) =>
      save(tx),
    );

    await expect(savePerfume({}, publishedPerfumeForm(1))).resolves.toEqual({
      errors: { slug: "That slug is already in use." },
    });
    expect(tx.perfume.findUnique).toHaveBeenCalledWith({
      where: { slug: "amber" },
      select: { id: true },
    });
    expect(tx.perfume.create).not.toHaveBeenCalled();
    expect(upload).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledExactlyOnceWith([upload.mock.calls[0][0]]);
  });
});
