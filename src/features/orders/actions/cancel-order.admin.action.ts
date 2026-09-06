"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";

import { cancelOrderAndRestoreStock } from "../repositories/order.repository";

export async function cancelOrderAdmin(reference: unknown) {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized." } as const;
  }
  if (typeof reference !== "string" || !reference.trim()) {
    return { error: "Order not found." } as const;
  }
  const orderReference = reference.trim();
  try {
    const result = await cancelOrderAndRestoreStock(orderReference);
    if ("ok" in result || "unchanged" in result) {
      revalidatePath("/admin");
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderReference}`);
    }
    return result;
  } catch (error) {
    console.error("[orders] cancellation failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "Unable to cancel this order. No changes were made." } as const;
  }
}
