"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect(siteConfig.routes.adminLogin);
}
