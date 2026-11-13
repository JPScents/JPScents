"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/app/_server/admin-session";

import { removeCustomer } from "@/modules/customers/server";

export async function deleteCustomerAdmin(id: unknown) {
  if (!(await getCurrentAdmin())) {
    return { error: "You are not authorized." } as const;
  }
  if (typeof id !== "string" || !id) {
    return { error: "Customer not found." } as const;
  }
  const result = await removeCustomer(id);
  if ("ok" in result) {
    revalidatePath("/admin/customers");
    revalidatePath("/admin");
  }
  return result;
}
