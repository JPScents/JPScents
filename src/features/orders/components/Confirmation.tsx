"use client";

import Link from "next/link";
import { useState } from "react";

import { siteConfig } from "@/config/site";

import type { PublicOrder } from "../types";
import { OrderSummary } from "./OrderSummary";

function whatsappUrl(number: string | undefined, reference: string, items: PublicOrder["items"]) {
  if (!number || !/^\d{7,15}$/.test(number)) return undefined;
  const context = items
    .map((item) => `${item.name} ${item.sizeLabel} ×${item.quantity}`)
    .join(", ");
  return `https://wa.me/${number}?text=${encodeURIComponent(`Hello JPScents, I’m following up on order ${reference} (${context}).`)}`;
}

export function Confirmation({
  order,
  businessNumber,
}: {
  order: PublicOrder | null;
  businessNumber?: string;
}) {
  const [copied, setCopied] = useState(false);
  if (!order)
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-20 text-center lg:px-public-gutter-desktop">
        <h1 className="font-display text-5xl">We can’t find that order confirmation.</h1>
        <p className="mt-4 text-jp-text-secondary">
          For privacy, order details are available only from the secure confirmation link after
          checkout.
        </p>
        <div className="mt-7 flex justify-center gap-3">
          <Link
            href={siteConfig.routes.perfumes}
            className="bg-jp-text-primary px-5 py-3 text-sm font-semibold text-jp-surface"
          >
            Browse Perfumes
          </Link>
          <Link href={siteConfig.routes.cart} className="border px-5 py-3 text-sm font-semibold">
            View Cart
          </Link>
        </div>
      </section>
    );
  const url = whatsappUrl(businessNumber, order.reference, order.items);
  return (
    <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-16">
      <div className="grid gap-12 lg:grid-cols-[1fr_29rem]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-jp-olive">
            Order received
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-6xl lg:text-7xl">
            Your order is confirmed.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-jp-text-secondary">
            Your order has been saved. Continue on WhatsApp with your reference to receive payment
            details and confirm delivery.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="bg-jp-text-primary px-6 py-4 text-sm font-bold uppercase tracking-[.08em] text-jp-surface"
              >
                Continue on WhatsApp
              </a>
            ) : (
              <button
                disabled
                className="bg-jp-text-primary px-6 py-4 text-sm font-bold uppercase tracking-[.08em] text-jp-surface opacity-45"
              >
                WhatsApp unavailable
              </button>
            )}
            <Link
              href={siteConfig.routes.perfumes}
              className="border border-jp-text-primary px-6 py-4 text-sm font-bold uppercase tracking-[.08em]"
            >
              Browse Perfumes
            </Link>
          </div>
        </div>
        <aside className="flex flex-col justify-between border bg-jp-green-surface p-8">
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-jp-olive">
            Your order reference
          </p>
          <strong className="my-8 whitespace-nowrap font-display text-4xl lg:text-5xl">
            {order.reference}
          </strong>
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(order.reference);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
            className="border-t pt-4 text-left text-sm font-semibold"
          >
            {copied ? "Copied" : "Copy Reference"}
          </button>
        </aside>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <OrderSummary order={order} />
        <section className="border bg-jp-surface p-6">
          <h2 className="font-display text-4xl">What happens next</h2>
          <ol className="mt-6 space-y-5 text-sm leading-6 text-jp-text-secondary">
            <li>
              <strong className="mr-3 text-jp-text-primary">01</strong>Continue on WhatsApp with
              your order reference.
            </li>
            <li>
              <strong className="mr-3 text-jp-text-primary">02</strong>Confirm availability,
              payment, and delivery details.
            </li>
            <li>
              <strong className="mr-3 text-jp-text-primary">03</strong>We’ll confirm your fulfilment
              details before dispatch.
            </li>
          </ol>
          <p className="mt-6 border-t pt-4 text-sm text-jp-text-secondary">
            No payment has been taken online.
          </p>
        </section>
      </div>
    </section>
  );
}
