"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";

import { deleteOrder } from "../orders";

export async function deleteOrderAdmin(reference: unknown) {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized." } as const;
  if (typeof reference !== "string" || !reference.trim()) return { error: "Order not found." } as const;
  const orderReference = reference.trim();
  const result = await deleteOrder(orderReference);
  if ("ok" in result) {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${orderReference}`);
  }
  return result;
}
