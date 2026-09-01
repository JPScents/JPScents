"use server";

import { headers } from "next/headers";

import { isTrustedAdminEmail } from "@/config/admin";
import { siteConfig } from "@/config/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type LoginState = {
  status?: "error" | "sent";
  message?: string;
};

const sentMessage = "If this address has Admin access, a secure sign-in link is on its way.";

export async function requestMagicLink(_: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Enter a valid email address." };
  }

  // Do not reveal the trusted address or ask Supabase to create other users.
  if (!isTrustedAdminEmail(email)) {
    return { status: "sent", message: sentMessage };
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || (await headers()).get("origin")?.trim();
  if (!origin) {
    return {
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again.",
    };
  }

  let callbackUrl: URL;
  try {
    callbackUrl = new URL(siteConfig.routes.authConfirm, origin);
  } catch {
    return {
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again.",
    };
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    console.error(
      "[admin-auth] Supabase client is unavailable:",
      error instanceof Error ? error.message : "Unknown configuration error",
    );
    return {
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again.",
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: false,
    },
  });

  if (error) {
    console.error("[admin-auth] Magic Link request failed:", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
    return {
      status: "error",
      message: "We couldn’t send the sign-in link. Please try again.",
    };
  }

  return { status: "sent", message: sentMessage };
}
