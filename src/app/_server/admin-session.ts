import "server-only";

import { createSupabaseServerClient } from "./supabase-session";
import { getAdminIdentity, type AdminIdentity } from "@/modules/access/server";

export async function getCurrentAdmin(): Promise<AdminIdentity | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    return getAdminIdentity(data.user);
  } catch {
    return null;
  }
}
