import { describe, expect, it } from "vitest";

import { getAdminIdentity } from "@/lib/auth/identity";

describe("getAdminIdentity", () => {
  it("rejects absent identities", () => expect(getAdminIdentity(null)).toBeNull());
  it("rejects identities without the trusted Admin app metadata", () => expect(getAdminIdentity({ id: "user", email: "user@example.com", app_metadata: { role: "customer" } })).toBeNull());
  it("accepts an Admin role only from app metadata", () => expect(getAdminIdentity({ id: "admin", email: "admin@example.com", app_metadata: { role: "admin" } })).toEqual({ id: "admin", email: "admin@example.com" }));
});
