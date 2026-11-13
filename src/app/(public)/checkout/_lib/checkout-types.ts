import type { CheckoutInput, OrderCartLine } from "@/modules/orders";

export const COMMERCE_SUBMISSION_STORAGE_KEY = "jpscents-commerce-submission";

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
