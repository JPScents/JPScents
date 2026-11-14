"use client";

import { createContext, useContext, type ReactNode } from "react";

import { useCartState } from "../hooks/useCartState";

const CartContext = createContext<ReturnType<typeof useCartState> | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const cart = useCartState();
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) {
    throw new Error("useCart must be used within CartProvider");
  }
  return cart;
}
