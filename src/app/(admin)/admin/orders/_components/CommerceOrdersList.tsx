import Link from "next/link";

import type { listAdminCommerceOrders } from "@/modules/orders/server";
import { formatEnumLabel } from "@/shared/utils/format-enum-label";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

type Rows = Awaited<ReturnType<typeof listAdminCommerceOrders>>;

const orderStates = [
  "AWAITING_PAYMENT",
  "RESERVATION_EXPIRED",
  "PAID",
  "REFUND_REQUIRED",
  "CANCELLED",
];
const fulfilmentStates = ["UNFULFILLED", "PROCESSING", "DISPATCHED", "DELIVERED"];

export function CommerceOrdersList({
  rows,
  query,
  status,
  fulfilment,
}: {
  rows: Rows;
  query: string;
  status?: string;
  fulfilment?: string;
}) {
  return (
    <section
      aria-label="Commerce orders"
      className="space-y-4 px-5 pt-7 lg:px-admin-content lg:pt-10"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-3xl">Commerce orders</h2>
        <Link
          href="/admin/orders/drafts"
          className="border bg-jp-surface px-4 py-2 text-sm underline"
        >
          Checkout drafts
        </Link>
      </div>
      <form className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          Search commerce orders
          <input
            className="h-10 border px-2"
            name="commerceQuery"
            defaultValue={query}
            maxLength={120}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Order status
          <select className="h-10 border px-2" name="commerceStatus" defaultValue={status ?? ""}>
            <option value="">All</option>
            {orderStates.map((state) => (
              <option key={state} value={state}>
                {formatEnumLabel(state)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Fulfilment
          <select className="h-10 border px-2" name="fulfilment" defaultValue={fulfilment ?? ""}>
            <option value="">All</option>
            {fulfilmentStates.map((state) => (
              <option key={state} value={state}>
                {formatEnumLabel(state)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="h-10 border px-4 text-sm">
          Filter commerce orders
        </button>
      </form>
      {rows.length ? (
        <ul className="divide-y border-y">
          {rows.map((order) => (
            <li key={order.reference} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <Link className="font-semibold underline" href={`/admin/orders/${order.reference}`}>
                {order.reference}
              </Link>
              <span className="flex-1">{order.customerNameSnapshot}</span>
              <span>{formatEnumLabel(order.commerceStatus ?? "UNKNOWN")}</span>
              <span>{formatEnumLabel(order.fulfilmentStatus ?? "UNKNOWN")}</span>
              <span>
                {order.totalMinor === null ? "—" : formatNairaFromMinor(order.totalMinor)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" role="status">
          No matching commerce orders.
        </p>
      )}
    </section>
  );
}
