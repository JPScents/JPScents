"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { applyAdminCommerceOrderAction, parseCommerceAdminAction } from "@/modules/orders/server";

export async function updateCommerceOrder(value: unknown) {
  const admin = await getCurrentAdmin();
  const request = parseCommerceAdminAction(value);
  if (!admin || !request) {
    return { error: "The order action was denied. Check your access and input." } as const;
  }
  try {
    const result = await applyAdminCommerceOrderAction(admin, request.id, request.command);
    revalidatePath("/admin/orders", "layout");
    return result;
  } catch {
    console.error("[orders] Admin commerce action failed.");
    return { error: "The order could not be updated. Refresh before trying again." } as const;
  }
}
