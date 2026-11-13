import type { NextRequest } from "next/server";

import { refreshSupabaseSession } from "@/app/_server/supabase-proxy";

export async function proxy(request: NextRequest) {
  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/(?:commerce/(?:reconcile|address-suggestions)|paystack/webhook)(?:/|$)|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)",
  ],
};
