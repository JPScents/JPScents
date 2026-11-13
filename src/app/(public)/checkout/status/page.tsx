import type { Metadata } from "next";
import Link from "next/link";

import {
  findStatusOrderPayment,
  getCommerceStatus,
  reconcileCommercePayment,
} from "@/modules/orders/server";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { SettlePaidCart } from "../_components/SettlePaidCart";
import { readCheckoutSessionToken, readCommerceStatusCookie } from "../_server/commerce-session";

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

const refundText = {
  REQUESTED: "Requested",
  AMBIGUOUS: "Awaiting verification",
  PENDING: "Pending with Paystack",
  PROCESSING: "Processing",
  PROCESSED: "Processed by Paystack. Your bank may need more time.",
  FAILED: "Needs follow-up",
  NEEDS_ATTENTION: "Needs follow-up",
};

const fulfilmentText = {
  UNFULFILLED: "Preparing your order",
  PROCESSING: "Preparing your order",
  DISPATCHED: "Your order has been dispatched",
  DELIVERED: "Your order has been delivered",
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
  const order = await getCommerceStatus(token, await readCheckoutSessionToken());
  const title = order?.retryable
    ? "Payment failed"
    : order?.status === "AWAITING_PAYMENT" && order.payment === "PENDING"
      ? "Payment pending"
      : (order?.status && statusText[order.status]) || "Order status is unavailable";
  const number = process.env.JP_SCENTS_WHATSAPP_NUMBER;
  const support =
    order && number && /^\d{7,15}$/.test(number)
      ? `https://wa.me/${number}?text=${encodeURIComponent(`Hello JPScents, I need help with order ${order.reference}.`)}`
      : undefined;

  return (
    <section className="mx-auto max-w-2xl px-5 py-14">
      <h1 className="font-display text-5xl">{title}</h1>
      {!order ? (
        <p className="mt-4 text-jp-text-secondary">
          Open the order’s status link or return to Checkout in the browser you used to pay.
        </p>
      ) : (
        <>
          {order.paidCart ? <SettlePaidCart {...order.paidCart} /> : null}
          <p className="mt-4">Order {order.reference}</p>
          {order.status === "PAID" && order.fulfilment ? (
            <p className="mt-3">{fulfilmentText[order.fulfilment]}</p>
          ) : null}
          {order.status === "AWAITING_PAYMENT" ? (
            <p className="mt-3 text-jp-text-secondary">
              {order.payment === "AMBIGUOUS" || order.payment === "NEEDS_ATTENTION"
                ? "We’re recovering the payment status. Check this page before trying to pay again."
                : "We’re checking your payment. Refresh this page for the latest status."}
            </p>
          ) : null}
          {order.status === "RESERVATION_EXPIRED" && !order.retryable ? (
            <p className="mt-3 text-jp-text-secondary">
              We released the stock while we check your payment. Check here for updates before
              trying to pay again.
            </p>
          ) : null}
          {order.retryable ? (
            <Link
              href={order.issuedQuote ? "/checkout/quote?retry=1" : "/checkout?retry=1"}
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
          {order.refunds.length ? (
            <section className="mt-6" aria-labelledby="refund-progress">
              <h2 id="refund-progress" className="font-display text-3xl">
                Refund progress
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {order.refunds.map((refund) => (
                  <li key={refund.id}>
                    {formatNairaFromMinor(refund.amountMinor)} · {refundText[refund.status]}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {support ? (
            <a href={support} className="mt-5 inline-block underline" rel="noreferrer">
              Contact JPScents on WhatsApp
            </a>
          ) : null}
        </>
      )}
    </section>
  );
}
