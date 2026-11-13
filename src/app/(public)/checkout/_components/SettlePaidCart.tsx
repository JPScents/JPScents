"use client";

import { useEffect } from "react";

import { useCart } from "@/app/(public)/_cart/providers/CartProvider";
import type { OrderCartLine } from "@/modules/orders";

import { COMMERCE_SUBMISSION_STORAGE_KEY } from "../_lib/checkout-types";

export function SettlePaidCart({
  submissionKey,
  lines,
}: {
  submissionKey: string;
  lines: OrderCartLine[];
}) {
  const { removePurchasedItems } = useCart();
  useEffect(() => {
    try {
      if (sessionStorage.getItem(COMMERCE_SUBMISSION_STORAGE_KEY) !== submissionKey) {
        return;
      }
      sessionStorage.removeItem(COMMERCE_SUBMISSION_STORAGE_KEY);
    } catch {
      return;
    }
    removePurchasedItems(lines);
  }, [submissionKey, lines, removePurchasedItems]);

  return null;
}
