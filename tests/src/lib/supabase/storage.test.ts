import { describe, expect, it, vi } from "vitest";

const { createSignedUrl } = vi.hoisted(() => ({ createSignedUrl: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    storage: { from: vi.fn(() => ({ createSignedUrl })) },
  })),
}));

import { getPerfumeImageUrl } from "@/lib/supabase/storage";

describe("getPerfumeImageUrl", () => {
  it("keeps controlled local assets unchanged", async () => {
    await expect(getPerfumeImageUrl("/perfume-placeholders/sample.svg")).resolves.toBe(
      "/perfume-placeholders/sample.svg",
    );
  });

  it("returns a short-lived signed Storage URL", async () => {
    createSignedUrl.mockResolvedValueOnce({
      data: { signedUrl: "https://signed.example/bottle" },
      error: null,
    });

    await expect(getPerfumeImageUrl("perfumes/id/bottle.webp")).resolves.toBe(
      "https://signed.example/bottle",
    );
    expect(createSignedUrl).toHaveBeenCalledWith("perfumes/id/bottle.webp", 3600);
  });
});
