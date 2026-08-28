"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminIdentity } from "@/lib/auth/identity";

export type LoginState = { error?: string };

export async function signIn(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = formData.get("email");
  const password = formData.get("password");
  if (typeof email !== "string" || typeof password !== "string") return { error: "Enter your email and password." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Unable to sign in with those details." };
  if (!getAdminIdentity(data.user)) {
    await supabase.auth.signOut();
    return { error: "Your account is not authorized to access Admin." };
  }
  redirect("/admin");
}
