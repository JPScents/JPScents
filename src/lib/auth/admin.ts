import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminIdentity, type AdminIdentity } from "@/lib/auth/identity";

export { getAdminIdentity, type AdminIdentity } from "@/lib/auth/identity";

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
