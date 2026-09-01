import type { User } from "@supabase/supabase-js";

import { isTrustedAdminEmail } from "@/config/admin";

export type AdminIdentity = { id: string; email: string | null };

export function getAdminIdentity(
  user: Pick<User, "id" | "email" | "app_metadata"> | null,
): AdminIdentity | null {
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email || user.app_metadata.role !== "admin" || !isTrustedAdminEmail(email))
    return null;
  return { id: user.id, email };
}
