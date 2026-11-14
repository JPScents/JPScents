import { isAddressAssistanceEnabled } from "@/infrastructure/google-places/places";
import {
  canStartPaystackPayment,
  isCommerceCheckoutActive,
} from "@/infrastructure/paystack/client";
import { listEnabledDeliveryDestinations } from "@/modules/delivery/server";
import { getCommerceCheckoutRecovery } from "@/modules/orders/server";

import { CommerceCheckoutForm } from "./_components/CommerceCheckoutForm";
import { Checkout } from "./_components/Checkout";
import { readCheckoutSessionToken, readCommerceStatusCookie } from "./_server/commerce-session";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ retry?: string }>;
}) {
  if (canStartPaystackPayment()) {
    const recovery =
      (await searchParams).retry === "1"
        ? await getCommerceCheckoutRecovery(
            await readCommerceStatusCookie(),
            await readCheckoutSessionToken(),
          )
        : null;
    return (
      <CommerceCheckoutForm
        destinations={await listEnabledDeliveryDestinations()}
        addressAssistance={isAddressAssistanceEnabled()}
        recovery={recovery}
      />
    );
  }
  if (isCommerceCheckoutActive()) {
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
