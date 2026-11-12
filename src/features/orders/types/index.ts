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
  status: OrderStatus;
  createdAt: Date;
  items: OrderLine[];
};

export type AdminOrder = PublicOrder & {
  legacy: boolean;
  customerName: string;
  whatsappNumber: string;
  email: string | null;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
  orderNote: string | null;
  events: Array<{
    id: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    createdAt: Date;
  }>;
};

export type AdminOrderRow = {
  reference: string;
  customerName: string;
  whatsappNumber: string;
  subtotalMinor: number;
  status: OrderStatus;
  createdAt: Date;
  itemCount: number;
};

export type CheckoutForm = Required<CheckoutInput> & { customCity: string };

export type CheckoutCart = {
  items: OrderCartLine[];
  lines: Array<{
    perfumeVariantId: string;
    requestedQuantity: number;
    name?: string;
    sizeLabel?: string;
    unitPriceMinor?: number;
    lineAmountMinor: number;
    imageUrl?: string;
    isValid: boolean;
  }>;
  subtotalMinor: number;
  hasInvalidLines: boolean;
  clearCart: () => void;
};
