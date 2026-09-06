import "server-only";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { findCustomerRecord, listCustomerRecords } from "../repositories/customer.repository";

export async function listCustomers(query?: string) {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
  return await listCustomerRecords(query);
}

export async function getCustomerById(id: string) {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
  return await findCustomerRecord(id);
}
