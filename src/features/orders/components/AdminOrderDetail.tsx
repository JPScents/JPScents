"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { siteConfig } from "@/config/site";

import { changeOrderStatus } from "../actions/change-order-status.admin.action";
import type { PublicOrder } from "../types";
import { OrderSummary } from "./OrderSummary";

const orderStatuses = ["NEW", "CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"];
const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
function whatsappUrl(
  number: string | undefined,
  customerName: string | undefined,
  reference: string,
  items: PublicOrder["items"],
) {
  if (!number || !/^\d{7,15}$/.test(number)) return undefined;
  const context = items
    .map((item) => `${item.name} ${item.sizeLabel} ×${item.quantity}`)
    .join(", ");
  return `https://wa.me/${number}?text=${encodeURIComponent(`Hello ${customerName || "there"}, this is JPScents following up on your order ${reference} (${context}). How can we help?`)}`;
}

type AdminOrder = PublicOrder & {
  customerName?: string;
  whatsappNumber?: string;
  email?: string | null;
  deliveryArea?: string;
  deliveryAddress?: string;
  orderNote?: string | null;
  events?: { id: string; fromStatus: string | null; toStatus: string; createdAt: Date }[];
};

export function AdminOrderDetail({ order }: { order: AdminOrder | null }) {
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [status, setStatus] = useState(order?.status ?? "NEW");
  if (!order)
    return (
      <section>
        <h1 className="font-display text-5xl">Order not found</h1>
        <p className="mt-4 text-jp-text-secondary">
          This order does not exist or is no longer available.
        </p>
        <Link
          href={siteConfig.routes.adminOrders}
          className="mt-6 inline-block border px-4 py-3 text-sm"
        >
          Back to Orders
        </Link>
      </section>
    );
  const url = whatsappUrl(order.whatsappNumber, order.customerName, order.reference, order.items);
  return (
    <section>
      <Link href={siteConfig.routes.adminOrders} className="text-sm">
        ← Orders
      </Link>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">Order</p>
          <h1 className="mt-2 font-display text-5xl">{order.reference}</h1>
        </div>
        <span className="border px-3 py-2 text-sm">{statusLabel(order.status)}</span>
      </div>
      <div className="mt-8 grid gap-7 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-7">
          <OrderSummary order={order} />
          <section className="border bg-jp-admin-surface p-6">
            <h2 className="font-display text-3xl">Activity</h2>
            <ol className="mt-5 space-y-4">
              {(order.events ?? []).map((event) => (
                <li key={event.id} className="border-l pl-4 text-sm">
                  <strong>{statusLabel(event.toStatus)}</strong>
                  <p className="mt-1 text-jp-text-secondary">
                    {new Intl.DateTimeFormat("en-NG", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(event.createdAt)}
                    {event.fromStatus
                      ? ` · changed from ${statusLabel(event.fromStatus)}`
                      : " · order placed"}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="space-y-6">
          <section className="border bg-jp-admin-surface p-5">
            <h2 className="font-display text-3xl">Customer</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-jp-text-secondary">Name</dt>
                <dd>{order.customerName}</dd>
              </div>
              <div>
                <dt className="text-jp-text-secondary">WhatsApp</dt>
                <dd>{order.whatsappNumber}</dd>
              </div>
              {order.email ? (
                <div>
                  <dt className="text-jp-text-secondary">Email</dt>
                  <dd>{order.email}</dd>
                </div>
              ) : null}
            </dl>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-block border px-4 py-3 text-sm font-semibold"
              >
                Message customer on WhatsApp
              </a>
            ) : null}
          </section>
          <section className="border bg-jp-admin-surface p-5">
            <h2 className="font-display text-3xl">Delivery</h2>
            <p className="mt-4 text-sm">
              <strong>{order.deliveryArea}</strong>
              <br />
              {order.deliveryAddress}
            </p>
            {order.orderNote ? (
              <p className="mt-4 text-sm text-jp-text-secondary">{order.orderNote}</p>
            ) : null}
          </section>
          <section className="border bg-jp-admin-surface p-5">
            <h2 className="font-display text-3xl">Update status</h2>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="mt-4 h-11 w-full border bg-white px-3 text-sm"
            >
              {orderStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
            <button
              disabled={pending || status === order.status}
              onClick={() =>
                start(async () => {
                  const result = await changeOrderStatus(order.reference, status);
                  setMessage(
                    "error" in result
                      ? (result.error ?? "Unable to update this order.")
                      : "unchanged" in result
                        ? "Status is already current."
                        : "Status updated.",
                  );
                })
              }
              className="mt-3 w-full bg-jp-admin-action py-3 text-sm font-semibold text-white disabled:opacity-45"
            >
              Save status
            </button>
            {message ? (
              <p className="mt-3 text-sm" role="status">
                {message}
              </p>
            ) : null}
          </section>
        </aside>
      </div>
    </section>
  );
}
