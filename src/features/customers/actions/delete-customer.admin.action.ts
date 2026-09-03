"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/lib/auth/admin";

import { removeCustomer } from "../services/customer.service";

export async function deleteCustomerAdmin(id: unknown) {
  if (!(await getCurrentAdmin())) return { error: "You are not authorized." } as const;
  if (typeof id !== "string" || !id) return { error: "Customer not found." } as const;
  const result = await removeCustomer(id);
  if ("ok" in result) {
    revalidatePath("/admin/customers");
    revalidatePath("/admin");
  }
  return result;
}
