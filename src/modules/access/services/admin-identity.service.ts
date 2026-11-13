import "server-only";

import { isTrustedAdminEmail } from "@/config/admin";

export type AdminIdentity = { id: string; email: string };

type TrustedUser = { id: string; email?: string; app_metadata: Record<string, unknown> };

export function getAdminIdentity(user: TrustedUser | null): AdminIdentity | null {
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email || user.app_metadata.role !== "admin" || !isTrustedAdminEmail(email)) {
    return null;
  }
  return { id: user.id, email };
}

export function requireAdmin(admin: AdminIdentity | null) {
  if (!admin) {
    throw new Error("You are not authorized.");
  }
}
