import type { OrderStatus } from "@/infrastructure/database/generated/enums";

import type { NigerianDestination } from "@/modules/delivery";

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

export type CommerceCheckoutInput = Omit<CheckoutInput, "email" | "deliveryState"> & {
  email: string;
  deliveryCountry: "NG";
  deliveryState: NigerianDestination;
  deliveryApartment?: string;
  deliveryLandmark?: string;
  deliveryPostcode?: string;
};

export type CommerceCheckoutRecovery = {
  submissionKey: string;
  details: CommerceCheckoutInput;
};

export type CommerceQuoteInput = {
  lines: Array<OrderCartLine & { unitPriceMinor: number }>;
  deliveryFeeMinor: number;
};

export type CommerceCheckoutCommand = {
  input: CommerceCheckoutInput;
  quote: CommerceQuoteInput;
  submissionKey: string;
  sessionToken: string;
  environment: "TEST" | "LIVE";
  issuedQuote?: { token: string; version: number };
};

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
  usesCurrentCatalogueDetails: boolean;
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
