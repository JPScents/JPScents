import type { Metadata } from "next";
import Link from "next/link";

import {
  findStatusOrderPayment,
  getCommerceStatus,
  reconcileCommercePayment,
} from "@/modules/orders/server";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { readCommerceStatusCookie } from "../_server/commerce-session";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const statusText = {
  AWAITING_PAYMENT: "Awaiting payment verification",
  RESERVATION_EXPIRED: "Stock reservation released",
  PAID: "Payment confirmed",
  REFUND_REQUIRED: "Refund being arranged",
  CANCELLED: "Order cancelled",
};

export default async function CommerceStatusPage() {
  const token = await readCommerceStatusCookie();
  const attempt = await findStatusOrderPayment(token);
  if (attempt && attempt.status !== "SUCCEEDED") {
    try {
      await reconcileCommercePayment(attempt.providerReference, attempt.environment);
    } catch {
      console.error("[orders] Status refresh could not verify payment.");
    }
  }
  const order = await getCommerceStatus(token);
  const title = order?.retryable
    ? "Payment failed"
    : (order?.status && statusText[order.status]) || "Order status is unavailable";

  return (
    <section className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="font-display text-5xl">{title}</h1>
      {!order ? (
        <p className="mt-4 text-jp-text-secondary">
          Open the order’s status link or return to Checkout in the browser you used to pay.
        </p>
      ) : (
        <>
          <p className="mt-4">Order {order.reference}</p>
          {order.status === "AWAITING_PAYMENT" ? (
            <p className="mt-3 text-jp-text-secondary">
              We’re checking your payment. Refresh this page for the latest status.
            </p>
          ) : null}
          {order.retryable ? (
            <Link
              href={order.issuedQuote ? "/checkout/quote" : "/checkout"}
              className="mt-4 inline-block underline"
            >
              Return to Checkout
            </Link>
          ) : null}
          <ul className="mt-6 divide-y border-y">
            {order.items.map((item, index) => (
              <li className="flex justify-between gap-4 py-3" key={index}>
                <span>
                  {item.name} {item.size} × {item.quantity}
                </span>
                <span>{formatNairaFromMinor(item.quantity * item.unitPriceMinor)}</span>
              </li>
            ))}
          </ul>
          {order.totalMinor !== null ? (
            <p className="mt-4 font-semibold">Total {formatNairaFromMinor(order.totalMinor)}</p>
          ) : null}
        </>
      )}
    </section>
  );
}
