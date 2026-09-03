import type { OrderStatus } from "@/db/generated/client";

export type OrderCartLine = { perfumeVariantId: string; quantity: number };
export type CheckoutInput = {
  customerName: string;
  whatsappNumber: string;
  email?: string;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
  orderNote?: string;
};
export type OrderFilters = { query?: string; status?: OrderStatus };

export type OrderLine = {
  name: string;
  sizeLabel: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
  imageUrl?: string;
};

export type PublicOrder = {
  reference: string;
  subtotalMinor: number;
  status: string;
  createdAt: Date;
  items: OrderLine[];
};

export type OrderRow = {
  reference: string;
  customerName: string;
  whatsappNumber: string;
  subtotalMinor: number;
  status: string;
  createdAt: Date;
  itemCount: number;
};
