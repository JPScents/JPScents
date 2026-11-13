import type { OrderStatus } from "@/infrastructure/database/generated/enums";

export const orderStatuses = [
  "AWAITING_PAYMENT",
  "PAID",
  "DELIVERED",
  "CANCELLED",
] as const satisfies readonly OrderStatus[];
