"use client";

import { Checkout as OrderCheckout } from "@/features/orders/client";
import { useCart } from "@/features/cart";

export function Checkout() {
  const cart = useCart();

  if (cart.resolutionState !== "idle") {
    const failed = cart.resolutionState === "error";
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-16 lg:px-public-gutter-desktop">
        <h1 className="font-display text-6xl">Checkout</h1>
        <p className="mt-5 text-jp-text-secondary" role={failed ? "alert" : "status"}>
          {failed
            ? "Cart availability could not be checked. Try again before Checkout."
            : "Checking current availability…"}
        </p>
        {failed ? (
          <button type="button" onClick={cart.refreshCart} className="mt-3 text-sm underline">
            Retry availability check
          </button>
        ) : null}
      </section>
    );
  }

  return <OrderCheckout cart={cart} />;
}
