import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

const CHECKOUT_COOKIE = "jp_commerce_checkout";
const STATUS_COOKIE = "jp_commerce_status";
const cookieOptions = {
  path: "/checkout",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
};

export async function readCheckoutSessionToken() {
  const token = (await cookies()).get(CHECKOUT_COOKIE)?.value;
  return token && /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}

export async function ensureCheckoutSessionToken() {
  const store = await cookies();
  const existing = store.get(CHECKOUT_COOKIE)?.value;
  if (existing && /^[A-Za-z0-9_-]{43}$/.test(existing)) {
    return existing;
  }
  const token = randomBytes(32).toString("base64url");
  store.set(CHECKOUT_COOKIE, token, { ...cookieOptions, maxAge: 24 * 60 * 60 });
  return token;
}

export async function setCommerceStatusCookie(token: string, expires?: Date) {
  (await cookies()).set(STATUS_COOKIE, token, {
    ...cookieOptions,
    ...(expires ? { expires } : { maxAge: 30 * 24 * 60 * 60 }),
  });
}

export async function readCommerceStatusCookie() {
  return (await cookies()).get(STATUS_COOKIE)?.value;
}
