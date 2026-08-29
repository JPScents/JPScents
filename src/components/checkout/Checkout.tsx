"use client";

import { Checkout as OrderCheckout } from "@/features/orders/client";
import { useCart } from "@/features/cart";

export function Checkout() {
  return <OrderCheckout cart={useCart()} />;
}
