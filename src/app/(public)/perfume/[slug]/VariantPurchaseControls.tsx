"use client";

import { VariantPurchaseControls as CatalogueVariantPurchaseControls } from "@/features/catalogue/client";
import { useCart } from "@/features/cart";

export function VariantPurchaseControls({ variants }: { variants: Array<{ id: string; sizeLabel: string; price: string; quantity: number; isAvailable: boolean }> }) {
  const { addItem } = useCart();

  return <CatalogueVariantPurchaseControls variants={variants} onAddItem={addItem} />;
}
