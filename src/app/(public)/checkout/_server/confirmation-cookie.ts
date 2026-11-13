import "server-only";

import { cookies } from "next/headers";

const confirmationCookie = "jpscents.order-confirmation";

export async function readConfirmationCookie() {
  return (await cookies()).get(confirmationCookie)?.value;
}

export async function writeConfirmationCookie(confirmationToken: string) {
  (await cookies()).set(confirmationCookie, confirmationToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/checkout/confirm",
  });
}
