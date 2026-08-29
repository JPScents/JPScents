"use server";

import { headers } from "next/headers";

import { adminConfig } from "@/config/admin";
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
  if (email !== adminConfig.trustedEmail) {
    return { status: "sent", message: sentMessage };
  }

  const origin = (await headers()).get("origin");
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
  } catch {
    return {
      status: "error",
      message: "Sign-in is temporarily unavailable. Please try again.",
    };
  }

  await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
      shouldCreateUser: false,
    },
  });

  return { status: "sent", message: sentMessage };
}
