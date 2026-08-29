export type CartRequestLine = { perfumeVariantId: string; quantity: number };
export type CartPayload = { version: number; items: CartRequestLine[] };
export type ResolvedCartLine = {
  perfumeVariantId: string;
  requestedQuantity: number;
  name?: string;
  slug?: string;
  sizeLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
  unitPriceMinor?: number;
  stock?: number;
  lineAmountMinor: number;
  isValid: boolean;
  issue?: "missing" | "unavailable" | "over-quantity";
};
