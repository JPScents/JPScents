import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getCurrentAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/lib/auth/admin", () => ({
  getCurrentAdmin: mocks.getCurrentAdmin,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));
vi.mock("@/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { setBestseller } from "@/features/catalogue/actions/bestseller.admin.action";
import {
  removePrimaryImage,
  savePrimaryImage,
} from "@/features/catalogue/actions/image.admin.action";
import { savePerfume } from "@/features/catalogue/actions/save-perfume.admin.action";
import {
  deleteVariant,
  saveVariant,
} from "@/features/catalogue/actions/variants.admin.action";
import { imageInputError } from "@/features/catalogue/fields";

describe("catalogue mutation boundaries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(imageInputError(valid, "Amber bottle")).toBeUndefined();
    expect(imageInputError(valid, "")).toBe("Useful alt text is required.");
    expect(imageInputError(invalidType, "Amber bottle")).toBe(
      "Use JPEG, PNG, or WebP up to 5 MiB.",
    );
  });
});
