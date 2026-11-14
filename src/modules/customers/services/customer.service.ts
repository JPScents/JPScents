import "server-only";
import { requireAdmin, type AdminIdentity } from "@/modules/access/server";
import { findCustomerRecord, listCustomerRecords } from "../repositories/customer.repository";

export async function listCustomers(admin: AdminIdentity | null, query?: string) {
  requireAdmin(admin);
  return await listCustomerRecords(query);
}

export async function getCustomerById(admin: AdminIdentity | null, id: string) {
  requireAdmin(admin);
  return await findCustomerRecord(id);
}
