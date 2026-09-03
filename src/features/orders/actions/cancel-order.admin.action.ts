"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";

import { cancelOrder } from "../orders";

export async function cancelOrderAdmin(reference: unknown) {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized." } as const;
  if (typeof reference !== "string" || !reference.trim())
    return { error: "Order not found." } as const;
  const orderReference = reference.trim();
  const result = await cancelOrder(orderReference);
  if ("ok" in result || "unchanged" in result) {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderReference}`);
  }
  return result;
}
