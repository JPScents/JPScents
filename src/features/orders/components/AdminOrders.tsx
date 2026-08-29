import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { siteConfig } from "@/config/site";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import type { OrderRow } from "../types";

const orderStatuses = ["NEW", "CONFIRMED", "AWAITING_PAYMENT", "CANCELLED"];
const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminOrders({
  orders,
  query,
  status,
}: {
  orders: OrderRow[];
  query?: string;
  status?: string;
}) {
  const filtered = Boolean(query || status);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">Orders</p>
          <h1 className="mt-2 font-display text-5xl">Orders</h1>
        </div>
      </div>
      <form className="mt-7 flex flex-wrap gap-3" action="/admin/orders">
        <input
          defaultValue={query}
          name="query"
          placeholder="Search reference, customer or phone"
          className="h-11 min-w-64 border bg-jp-admin-surface px-3 text-sm"
        />
        <select
          name="status"
          defaultValue={status ?? ""}
          className="h-11 border bg-jp-admin-surface px-3 text-sm"
        >
          <option value="">All statuses</option>
          {orderStatuses.map((value) => (
            <option key={value} value={value}>
              {statusLabel(value)}
            </option>
          ))}
        </select>
        <button className="border px-4 text-sm font-semibold">Filter</button>
      </form>
      {orders.length ? (
        <>
          <div className="mt-7 hidden overflow-x-auto border lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase tracking-[.1em] text-jp-text-secondary">
                <tr>
                  <th className="p-4">Reference</th>
                  <th>Customer</th>
                  <th>Placed</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.reference} className="border-b last:border-0">
                    <td className="p-4 font-semibold">
                      <Link href={siteConfig.routes.adminOrder(order.reference)}>
                        {order.reference}
                      </Link>
                    </td>
                    <td>
                      {order.customerName}
                      <br />
                      <span className="text-xs text-jp-text-secondary">{order.whatsappNumber}</span>
                    </td>
                    <td>
                      {new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(
                        order.createdAt,
                      )}
                    </td>
                    <td>{order.itemCount}</td>
                    <td>{formatNairaFromMinor(order.subtotalMinor)}</td>
                    <td>
                      <span className="border px-2 py-1 text-xs">{statusLabel(order.status)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-7 grid gap-3 lg:hidden">
            {orders.map((order) => (
              <Link
                key={order.reference}
                href={siteConfig.routes.adminOrder(order.reference)}
                className="border bg-jp-admin-surface p-4"
              >
                <div className="flex justify-between">
                  <strong>{order.reference}</strong>
                  <span className="text-xs">{statusLabel(order.status)}</span>
                </div>
                <p className="mt-3">{order.customerName}</p>
                <p className="text-sm text-jp-text-secondary">{order.whatsappNumber}</p>
                <div className="mt-4 flex justify-between text-sm">
                  <span>{order.itemCount} items</span>
                  <strong>{formatNairaFromMinor(order.subtotalMinor)}</strong>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-8"
          eyebrow={filtered ? "No matching orders" : "Orders empty"}
          title={filtered ? "No orders match these filters." : "No orders have been placed yet."}
          description={
            filtered
              ? "Clear the search or choose another status to see the order list."
              : "New customer orders will appear here after checkout creates a saved order."
          }
        >
          {filtered ? (
            <Link
              href={siteConfig.routes.adminOrders}
              className="border border-jp-admin-action px-4 py-3 text-sm font-semibold"
            >
              Clear filters
            </Link>
          ) : null}
        </EmptyState>
      )}
    </section>
  );
}
