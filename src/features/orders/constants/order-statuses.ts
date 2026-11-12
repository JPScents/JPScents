import type { OrderStatus } from "@/db/generated/client";

export const orderStatuses = [
  "AWAITING_PAYMENT",
  "PAID",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];
