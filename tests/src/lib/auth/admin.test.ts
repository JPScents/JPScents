import { beforeEach, describe, expect, it, vi } from "vitest";

import { adminConfig } from "@/config/admin";

const mocks = vi.hoisted(() => ({ createSupabaseServerClient: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
}));

import { getCurrentAdmin } from "@/lib/auth/admin";

describe("getCurrentAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  it("treats missing Supabase configuration as signed out", async () => {
    mocks.createSupabaseServerClient.mockRejectedValue(new Error("not configured"));
    await expect(getCurrentAdmin()).resolves.toBeNull();
  });

  it("accepts only a trusted Admin identity", async () => {
    mocks.createSupabaseServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: { id: "admin", email: adminConfig.trustedEmail, app_metadata: { role: "admin" } },
          },
          error: null,
        }),
      },
    });
    await expect(getCurrentAdmin()).resolves.toEqual({
      id: "admin",
      email: adminConfig.trustedEmail,
    });
  });
});
