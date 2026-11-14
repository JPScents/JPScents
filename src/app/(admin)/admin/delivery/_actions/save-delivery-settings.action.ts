"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { siteConfig } from "@/config/site";
import type { DeliverySettingsResult } from "@/modules/delivery";
import { parseDeliverySettings, saveDeliverySettings } from "@/modules/delivery/server";

export async function updateDeliverySettings(value: unknown): Promise<DeliverySettingsResult> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return { ok: false, message: "You are not authorized to change delivery settings." };
  }
  const settings = parseDeliverySettings(value);
  if (!settings) {
    return { ok: false, message: "Enter valid delivery settings and try again." };
  }

  try {
    const result = await saveDeliverySettings(admin, settings);
    if (result.ok) {
      revalidatePath(siteConfig.routes.adminDelivery);
      revalidatePath(siteConfig.routes.checkout);
    }
    return result;
  } catch {
    console.error("[delivery] Delivery settings update failed.");
    return { ok: false, message: "Delivery settings could not be saved. Please try again." };
  }
}
