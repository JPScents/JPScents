import { canStartPaystackPayment } from "@/infrastructure/paystack/client";
import { listEnabledDeliveryDestinations } from "@/modules/delivery/server";

import { CommerceCheckoutForm } from "./_components/CommerceCheckoutForm";
import { Checkout } from "./_components/Checkout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  if (canStartPaystackPayment()) {
    return <CommerceCheckoutForm destinations={await listEnabledDeliveryDestinations()} />;
  }
  if (
    process.env.COMMERCE_CHECKOUT_ACTIVE === "true" ||
    process.env.COMMERCE_PAYMENTS_ENABLED === "true"
  ) {
    return (
      <section className="mx-auto max-w-2xl px-5 py-14">
        <h1 className="font-display text-5xl">Checkout</h1>
        <p className="mt-4" role="status">
          Online payments are temporarily unavailable. Your cart is saved.
        </p>
      </section>
    );
  }
  return <Checkout />;
}
