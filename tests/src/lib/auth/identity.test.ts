import { describe, expect, it } from "vitest";

import { adminConfig } from "@/config/admin";
import { getAdminIdentity } from "@/lib/auth/identity";

describe("getAdminIdentity", () => {
  it("rejects absent identities", () => expect(getAdminIdentity(null)).toBeNull());
  it("rejects identities without the trusted Admin app metadata", () =>
    expect(
      getAdminIdentity({
        id: "user",
        email: adminConfig.trustedEmail,
        app_metadata: { role: "customer" },
      }),
    ).toBeNull());
  it("rejects another email even when it has the Admin role", () =>
    expect(
      getAdminIdentity({ id: "user", email: "other@example.com", app_metadata: { role: "admin" } }),
    ).toBeNull());
  it("accepts only the submitted JPScents email with trusted Admin metadata", () =>
    expect(
      getAdminIdentity({
        id: "admin",
        email: adminConfig.trustedEmail.toUpperCase(),
        app_metadata: { role: "admin" },
      }),
    ).toEqual({ id: "admin", email: adminConfig.trustedEmail }));
});
