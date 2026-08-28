import type { User } from "@supabase/supabase-js";

export type AdminIdentity = { id: string; email: string | null };

export function getAdminIdentity(user: Pick<User, "id" | "email" | "app_metadata"> | null): AdminIdentity | null {
  if (!user || user.app_metadata.role !== "admin") return null;
  return { id: user.id, email: user.email ?? null };
}
