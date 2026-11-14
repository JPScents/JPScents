import "server-only";
import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseSessionClient } from "@/infrastructure/supabase/client";
import { getSupabaseConfig } from "@/infrastructure/supabase/config";

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  let config;
  try {
    config = getSupabaseConfig();
  } catch {
    return response;
  }

  const supabase = createSupabaseSessionClient(
    {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
    config,
  );

  await supabase.auth.getUser();
  return response;
}
