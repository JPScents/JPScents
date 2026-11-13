import type { Metadata } from "next";

import { isAddressAssistanceEnabled } from "@/infrastructure/google-places/places";
import { canStartPaystackPayment } from "@/infrastructure/paystack/client";
import { listEnabledDeliveryDestinations } from "@/modules/delivery/server";
import { getCheckoutQuote, getCommerceCheckoutRecovery } from "@/modules/orders/server";

import { CommerceCheckoutForm } from "../_components/CommerceCheckoutForm";
import {
  readCheckoutSessionToken,
  readCommerceQuoteCookie,
  readCommerceStatusCookie,
} from "../_server/commerce-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

export default async function CheckoutQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ retry?: string }>;
}) {
  const checkoutSession = await readCheckoutSessionToken();
  const quote = await getCheckoutQuote(await readCommerceQuoteCookie(), checkoutSession);
  if (!quote || !canStartPaystackPayment()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-14">
        <h1 className="font-display text-5xl">Checkout link unavailable</h1>
        <p className="mt-4 text-jp-text-secondary">
          Contact JPScents if you need a new link or help with an existing payment.
        </p>
      </main>
    );
  }
  const recovery =
    (await searchParams).retry === "1"
      ? await getCommerceCheckoutRecovery(
          await readCommerceStatusCookie(),
          checkoutSession,
          quote.storageId,
        )
      : null;
  return (
    <CommerceCheckoutForm
      issuedQuote={quote}
      destinations={await listEnabledDeliveryDestinations()}
      addressAssistance={isAddressAssistanceEnabled()}
      recovery={recovery}
    />
  );
}
