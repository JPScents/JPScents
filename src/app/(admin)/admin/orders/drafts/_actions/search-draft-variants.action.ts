"use server";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { searchCheckoutVariants } from "@/modules/catalogue/server";

export async function findDraftVariants(value: unknown) {
  if (!(await getCurrentAdmin()) || typeof value !== "string" || value.length > 80) {
    return [];
  }
  const rows = await searchCheckoutVariants(value);
  return rows.map((row) => ({
    id: row.id,
    name: row.perfume.name,
    size: row.sizeValue.toString(),
    priceMinor: row.priceMinor,
    available: row.quantity,
  }));
}
