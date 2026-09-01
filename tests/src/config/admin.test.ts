import { afterEach, describe, expect, it, vi } from "vitest";

describe("Admin email configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("trusts the configured primary and optional secondary addresses", async () => {
    vi.stubEnv("JP_SCENTS_ADMIN_EMAIL", " Primary@Example.com ");
    vi.stubEnv("JP_SCENTS_SECONDARY_ADMIN_EMAIL", " Secondary@Example.com ");

    const { adminConfig, isTrustedAdminEmail } = await import("@/config/admin");

    expect(adminConfig.trustedEmails).toEqual(["primary@example.com", "secondary@example.com"]);
    expect(isTrustedAdminEmail(" PRIMARY@example.com ")).toBe(true);
    expect(isTrustedAdminEmail("secondary@example.com")).toBe(true);
    expect(isTrustedAdminEmail("other@example.com")).toBe(false);
  });

  it("does not retain secondary access when the optional variable is absent", async () => {
    vi.stubEnv("JP_SCENTS_ADMIN_EMAIL", "primary@example.com");
    vi.stubEnv("JP_SCENTS_SECONDARY_ADMIN_EMAIL", "");

    const { adminConfig, isTrustedAdminEmail } = await import("@/config/admin");

    expect(adminConfig.trustedEmails).toEqual(["primary@example.com"]);
    expect(isTrustedAdminEmail("secondary@example.com")).toBe(false);
  });
});
