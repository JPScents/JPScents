import { beforeEach, describe, expect, it, vi } from "vitest";

const { getHeaders, signInWithOtp } = vi.hoisted(() => ({
  getHeaders: vi.fn(),
  signInWithOtp: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: getHeaders }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { signInWithOtp },
  })),
}));

import { requestMagicLink } from "@/app/(admin-auth)/admin/login/actions";

describe("Admin magic-link request", () => {
  beforeEach(() => {
    getHeaders.mockReset();
    signInWithOtp.mockReset();
    getHeaders.mockResolvedValue(new Headers({ origin: "http://127.0.0.1:3000" }));
    signInWithOtp.mockResolvedValue({ error: null });
  });

  it("rejects malformed input before calling Supabase", async () => {
    const formData = new FormData();
    formData.set("email", "not-an-email");

    const result = await requestMagicLink({}, formData);

    expect(result.status).toBe("error");
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("does not reveal or call Supabase for another email", async () => {
    const formData = new FormData();
    formData.set("email", "someone@example.com");

    const result = await requestMagicLink({}, formData);

    expect(result).toEqual({
      status: "sent",
      message: "If this address has Admin access, a secure sign-in link is on its way.",
    });
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("sends a link only to the normalized trusted email without creating a user", async () => {
    const formData = new FormData();
    formData.set("email", " JPSCENTS23@GMAIL.COM ");

    await requestMagicLink({}, formData);

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "jpscents23@gmail.com",
      options: {
        emailRedirectTo: "http://127.0.0.1:3000/auth/confirm",
        shouldCreateUser: false,
      },
    });
  });
});
