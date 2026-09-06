"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";
import { updateOrderStatus } from "../repositories/order.repository";

import { orderStatuses } from "../constants/order-statuses";

export async function changeOrderStatus(reference: unknown, status: unknown) {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized." };
  }
  if (typeof reference !== "string" || !reference.trim()) {
    return { error: "Order not found." } as const;
  }
  const orderReference = reference.trim();
  const nextStatus = orderStatuses.find((value) => value === status);
  if (!nextStatus) {
    return { error: "Choose a valid order status." } as const;
  }
  if (nextStatus === "CANCELLED") {
    return { error: "Use the cancellation action to cancel an order." } as const;
  }
  try {
    const result = await updateOrderStatus(orderReference, nextStatus);
    if ("ok" in result) {
      revalidatePath("/admin");
      revalidatePath("/admin/orders");
      revalidatePath(`/admin/orders/${orderReference}`);
    }
    return result;
  } catch (error) {
    console.error("[orders] status update failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "Unable to update this order." } as const;
  }
}
