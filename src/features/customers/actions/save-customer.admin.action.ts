"use server";

import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import { getCurrentAdmin } from "@/lib/auth/admin";

import { parseCustomerForm } from "../parsers/customer-form.parser";
import { saveCustomer } from "../services/customer.service";
import type { CustomerActionState } from "../types";

export type { CustomerActionState } from "../types";

export async function saveCustomerAdmin(
  _: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  if (!(await getCurrentAdmin())) return { errors: { form: "You are not authorized." } };
  const parsed = parseCustomerForm(formData);
  if (!parsed.input) return { errors: parsed.errors };
  const id = formData.get("id");
  const result = await saveCustomer(typeof id === "string" && id ? id : undefined, parsed.input);
  if ("errors" in result) return result;
  redirect(siteConfig.routes.adminCustomer(result.customer.id));
}
