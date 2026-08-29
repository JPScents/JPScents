import type { OrderStatus } from "@/db/generated/client";

export type OrderCartLine = { perfumeVariantId: string; quantity: number };
export type CheckoutInput = {
  customerName: string;
  whatsappNumber: string;
  email?: string;
  deliveryArea: string;
  deliveryAddress: string;
  orderNote?: string;
};
export type OrderFilters = { query?: string; status?: OrderStatus };
