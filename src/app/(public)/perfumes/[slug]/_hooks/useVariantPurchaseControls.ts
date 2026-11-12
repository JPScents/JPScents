"use client";

import { useState } from "react";

import { commerceConfig } from "@/config/commerce";
import { useCart } from "@/features/cart";
import type { PublicPerfumeDetail } from "@/features/catalogue";

export function useVariantPurchaseControls(variants: PublicPerfumeDetail["variants"]) {
  const [selectedId, setSelectedId] = useState<string | undefined>(() => {
    const available = variants.filter((variant) => variant.isAvailable);
    return available.length === 1 ? available[0]?.id : undefined;
  });
  const [requestedQuantity, setQuantity] = useState(1);
  const selectedVariant = variants.find(
    (variant) => variant.id === selectedId && variant.isAvailable,
  );
  const maximumQuantity = Math.min(
    selectedVariant?.quantity ?? 0,
    commerceConfig.maximumVariantQuantity,
  );
  const quantity = Math.max(1, Math.min(requestedQuantity, maximumQuantity));
  const { addItem } = useCart();

  function selectVariant(id: string) {
    setSelectedId(id);
    setQuantity(1);
  }

  function increaseQuantity() {
    if (selectedVariant) {
      setQuantity((value) => Math.min(maximumQuantity, value + 1));
    }
  }

  function decreaseQuantity() {
    setQuantity((value) => Math.max(1, Math.min(value, maximumQuantity) - 1));
  }

  function addSelectedVariant() {
    if (selectedVariant) {
      addItem(selectedVariant.id, quantity, selectedVariant.quantity);
    }
  }

  return {
    selectedVariant,
    quantity,
    canIncreaseQuantity: Boolean(selectedVariant && quantity < maximumQuantity),
    canDecreaseQuantity: Boolean(selectedVariant && quantity > 1),
    canAddToCart: Boolean(selectedVariant),
    selectVariant,
    increaseQuantity,
    decreaseQuantity,
    addSelectedVariant,
  };
}
