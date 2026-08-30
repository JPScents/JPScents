import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { siteConfig } from "@/config/site";
import { getAdminIdentity } from "@/lib/auth/identity";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const allowedOtpTypes = new Set<EmailOtpType>(["email", "magiclink"]);

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  let verified = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    verified = !error;
  } else if (tokenHash && type && allowedOtpTypes.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    verified = !error;
  }

  if (verified) {
    const { data, error } = await supabase.auth.getUser();
    verified = !error && Boolean(getAdminIdentity(data.user));
  }

  if (!verified) {
    await supabase.auth.signOut({ scope: "local" });
    const response = NextResponse.redirect(
      new URL(`${siteConfig.routes.adminLogin}?error=invalid`, request.url),
    );
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }

  const response = NextResponse.redirect(new URL(siteConfig.routes.admin, request.url));
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
