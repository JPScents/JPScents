import Link from "next/link";

import type { getAdminCommerceOrder } from "@/modules/orders/server";
import { formatEnumLabel } from "@/shared/utils/format-enum-label";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { CommerceOrderControls } from "./CommerceOrderControls";

type Order = NonNullable<Awaited<ReturnType<typeof getAdminCommerceOrder>>>;

function money(value: number | null) {
  return value === null ? "Unavailable" : formatNairaFromMinor(value);
}

export function AdminCommerceOrder({ order }: { order: Order }) {
  return (
    <main className="space-y-6 px-5 py-7 lg:px-admin-content lg:py-10">
      <Link className="text-sm underline" href="/admin/orders">
        Orders
      </Link>
      <header>
        <h1 className="font-display text-4xl">Order {order.reference}</h1>
        <p className="mt-2 text-sm">
          {formatEnumLabel(order.commerceStatus ?? "UNKNOWN")} ·{" "}
          {formatEnumLabel(order.fulfilmentStatus ?? "UNKNOWN")}
        </p>
      </header>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="space-y-3 border bg-jp-surface p-5">
          <h2 className="font-display text-2xl">Order details</h2>
          <ul className="divide-y">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  {item.perfumeNameSnapshot} {item.sizeValueSnapshot} mL × {item.quantity}
                </span>
                <span>{money(item.quantity * item.unitPriceMinor)}</span>
              </li>
            ))}
          </ul>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(order.subtotalMinor)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{money(order.deliveryFeeMinor)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd>{money(order.totalMinor)}</dd>
            </div>
          </dl>
        </section>
        <section className="space-y-2 border bg-jp-surface p-5">
          <h2 className="font-display text-2xl">Delivery and contact</h2>
          <p>
            {order.customerNameSnapshot} · {order.emailSnapshot} · {order.whatsappNumberSnapshot}
          </p>
          <p>
            {[
              order.deliveryAddressSnapshot,
              order.deliveryApartment,
              order.deliveryLandmark,
              order.deliveryCitySnapshot,
              order.deliveryStateSnapshot,
              order.deliveryPostcode,
              "Nigeria",
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
          {order.orderNote ? <p>Instructions {order.orderNote}</p> : null}
        </section>
        <section className="space-y-2 border bg-jp-surface p-5">
          <h2 className="font-display text-2xl">Payment and refunds</h2>
          {order.paymentAttempts.map((attempt) => (
            <div key={attempt.id} className="space-y-1 border-b pb-2 text-sm">
              <p>
                {attempt.providerReference} · {formatEnumLabel(attempt.status)} ·{" "}
                {money(attempt.amountMinor)}
              </p>
              {attempt.issue ? <p role="status">{formatEnumLabel(attempt.issue)}</p> : null}
              {attempt.refunds.map((refund) => (
                <p key={refund.id}>
                  Refund {refund.providerReference} · {money(refund.amountMinor)} ·{" "}
                  {formatEnumLabel(refund.status)} · {refund.reason}
                  {refund.issue ? ` · ${formatEnumLabel(refund.issue)}` : ""}
                </p>
              ))}
            </div>
          ))}
        </section>
        <CommerceOrderControls
          id={order.id}
          status={order.commerceStatus}
          fulfilment={order.fulfilmentStatus}
          refundableMinor={order.refundableMinor}
          items={order.items.map((item) => ({
            perfumeVariantId: item.perfumeVariantId,
            name: item.perfumeNameSnapshot ?? "Perfume",
            quantity: item.quantity,
          }))}
        />
        <section className="space-y-2 border bg-jp-surface p-5">
          <h2 className="font-display text-2xl">Inventory activity</h2>
          {order.reservations.map((reservation) => (
            <p key={reservation.id} className="text-sm">
              {formatEnumLabel(reservation.status)} · Expires{" "}
              {reservation.expiresAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
            </p>
          ))}
          {order.stockMovements.map((move) => (
            <p key={move.id} className="text-sm">
              {formatEnumLabel(move.kind)} · {move.quantity} units
            </p>
          ))}
        </section>
        <section className="space-y-2 border bg-jp-surface p-5">
          <h2 className="font-display text-2xl">Order activity</h2>
          {order.commerceEvents.length ? (
            order.commerceEvents.map((event) => (
              <p key={event.id} className="text-sm">
                {formatEnumLabel(event.action)} ·{" "}
                {event.createdAt.toLocaleString("en-NG", { timeZone: "Africa/Lagos" })}
                {event.actorId ? ` · Admin ${event.actorId}` : ""}
                {event.reason ? ` · ${event.reason}` : ""}
              </p>
            ))
          ) : (
            <p className="text-sm">No Admin actions recorded.</p>
          )}
        </section>
      </div>
    </main>
  );
}
