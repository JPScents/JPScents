import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { siteConfig } from "@/config/site";

type CustomerListItem = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  updatedAt: Date;
  _count: { orders: number };
};

export function CustomerList({
  customers,
  query,
}: {
  customers: CustomerListItem[];
  query?: string;
}) {
  const filtered = Boolean(query);
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">
            Customers
          </p>
          <h1 className="mt-2 font-display text-5xl">Customers</h1>
        </div>
        <Link
          href={siteConfig.routes.adminNewCustomer}
          className="bg-jp-admin-action px-4 py-3 text-sm font-semibold text-white"
        >
          Add customer
        </Link>
      </div>
      <form className="mt-7 flex gap-3" action={siteConfig.routes.adminCustomers}>
        <input
          defaultValue={query}
          name="query"
          placeholder="Search name, WhatsApp or email"
          className="h-11 min-w-64 border bg-jp-admin-surface px-3 text-sm"
        />
        <button className="border px-4 text-sm font-semibold">Search</button>
      </form>
      {customers.length ? (
        <div className="mt-7 divide-y border border-jp-admin-border bg-jp-admin-surface">
          {customers.map((customer) => (
            <Link
              key={customer.id}
              href={siteConfig.routes.adminCustomer(customer.id)}
              className="grid gap-2 p-4 text-sm sm:grid-cols-[minmax(0,1fr)_12rem_9rem] sm:items-center"
            >
              <span>
                <strong className="block">{customer.name}</strong>
                <span className="text-jp-text-secondary">
                  {customer.email ?? customer.whatsappNumber}
                </span>
              </span>
              <span>{customer.whatsappNumber}</span>
              <span>{customer._count.orders} orders</span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-8"
          eyebrow={filtered ? "No matching customers" : "Customers empty"}
          title={filtered ? "No customers match this search." : "No customers yet."}
          description={
            filtered
              ? "Try another name, WhatsApp number, or email address."
              : "Customers are saved automatically when an order is placed."
          }
        >
          {filtered ? (
            <Link
              className="border px-4 py-3 text-sm font-semibold"
              href={siteConfig.routes.adminCustomers}
            >
              Clear search
            </Link>
          ) : null}
        </EmptyState>
      )}
    </section>
  );
}
