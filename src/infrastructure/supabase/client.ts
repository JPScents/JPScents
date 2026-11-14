import "server-only";

import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

import { getSupabaseConfig } from "./config";

export function createSupabaseSessionClient(
  cookies: CookieMethodsServer,
  config = getSupabaseConfig(),
) {
  return createServerClient(config.url, config.publishableKey, { cookies });
}

export function createPublicSupabaseClient() {
  const { url, publishableKey } = getSupabaseConfig();
  return createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
