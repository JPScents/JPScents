"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { siteConfig } from "@/config/site";
import { requeueNotification } from "@/modules/notifications/server";
import { reconcileCommerceWork } from "@/modules/orders/server";
import { prioritisePaymentCheck, prioritiseRefundCheck } from "@/modules/payments/server";

const rowActions = {
  payment: prioritisePaymentCheck,
  refund: prioritiseRefundCheck,
  email: requeueNotification,
} as const;

export type OperationsActionState = { message: string; error?: boolean };

export async function reconcileAdminCommerce(
  _previous: OperationsActionState,
  formData: FormData,
): Promise<OperationsActionState> {
  if (!(await getCurrentAdmin())) {
    return { message: "You are not authorized.", error: true };
  }
  const kind = formData.get("kind");
  const id = formData.get("id");
  try {
    if (kind !== "batch") {
      if (
        (kind !== "payment" && kind !== "refund" && kind !== "email") ||
        typeof id !== "string" ||
        !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
      ) {
        return { message: "This recovery request is invalid.", error: true };
      }
      if (!(await rowActions[kind](id, new Date()))) {
        return { message: "This entry is no longer eligible for a retry.", error: true };
      }
    }
    const run = await reconcileCommerceWork("ADMIN");
    return {
      message: run.errors
        ? "Recovery finished with issues. Review the entries and recent runs below."
        : "Recovery finished. Review the latest status below.",
      error: run.errors > 0,
    };
  } catch {
    return {
      message: "Recovery could not finish. Try again or check the deployment.",
      error: true,
    };
  } finally {
    revalidatePath(siteConfig.routes.adminOperations);
  }
}
