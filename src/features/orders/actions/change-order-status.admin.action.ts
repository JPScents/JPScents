"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";
import { updateOrderStatus } from "../orders";

export async function changeOrderStatus(reference: string, status: string) {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized." };
  const result = await updateOrderStatus(reference, status);
  if ("ok" in result) {
    revalidatePath("/admin");
    revalidatePath("/admin/orders");
    revalidatePath(`/admin/orders/${reference}`);
  }
  return result;
}
