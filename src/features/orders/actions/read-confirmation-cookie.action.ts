"use server";

import { cookies } from "next/headers";

const confirmationCookie = "jpscents.order-confirmation";

export async function readConfirmationCookie() {
  return (await cookies()).get(confirmationCookie)?.value;
}
