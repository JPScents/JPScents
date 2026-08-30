import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, getUser, signOut, verifyOtp } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  signOut: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession, getUser, signOut, verifyOtp },
  })),
}));

import { GET } from "@/app/auth/confirm/route";

describe("Admin magic-link confirmation", () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
    getUser.mockReset();
    signOut.mockReset();
    verifyOtp.mockReset();
    exchangeCodeForSession.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: null });
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-id",
          email: "jpscents23@gmail.com",
          app_metadata: { role: "admin" },
        },
      },
      error: null,
    });
    signOut.mockResolvedValue({ error: null });
  });

  it("exchanges a PKCE code and enters Admin", async () => {
    const response = await GET(
      new NextRequest("https://jpscents.test/auth/confirm?code=one-time-code"),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.headers.get("location")).toBe("https://jpscents.test/admin");
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(signOut).not.toHaveBeenCalled();
  });

  it("supports the token-hash email template", async () => {
    const response = await GET(
      new NextRequest("https://jpscents.test/auth/confirm?token_hash=hashed&type=email"),
    );

    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "hashed",
      type: "email",
    });
    expect(response.headers.get("location")).toBe("https://jpscents.test/admin");
  });

  it("clears a session that lacks the trusted Admin role", async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: "admin-id",
          email: "jpscents23@gmail.com",
          app_metadata: {},
        },
      },
      error: null,
    });

    const response = await GET(
      new NextRequest("https://jpscents.test/auth/confirm?code=one-time-code"),
    );

    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      "https://jpscents.test/admin/login?error=invalid",
    );
    expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("rejects unapproved email-token types", async () => {
    const response = await GET(
      new NextRequest("https://jpscents.test/auth/confirm?token_hash=hashed&type=recovery"),
    );

    expect(verifyOtp).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(response.headers.get("location")).toBe(
      "https://jpscents.test/admin/login?error=invalid",
    );
  });
});
