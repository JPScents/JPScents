import "server-only";

import { cookies } from "next/headers";

import { createSupabaseSessionClient } from "@/infrastructure/supabase/client";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createSupabaseSessionClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Server Components cannot write cookies; proxy.ts refreshes sessions.
      }
    },
  });
}
