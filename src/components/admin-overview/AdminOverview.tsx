import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { siteConfig } from "@/config/site";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";
import type { OrderRow } from "@/features/orders";

const statusLabel = (status: string) =>
  status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export function AdminOverview({
  overview,
  bestseller,
}: {
  overview: {
    awaitingAction: number;
    totalPerfumes: number;
    availablePerfumes: number;
    zeroStockVariants: number;
    ordersThisWeek: number;
    recentOrders: OrderRow[];
    attention: { id: string; name: string; status: string }[];
    bestseller: { id: string; name: string } | null;
  };
  bestseller: ReactNode;
}) {
  const metrics = [
    ["Orders awaiting action", overview.awaitingAction],
    ["Available perfumes", overview.availablePerfumes],
    ["Zero-stock variants", overview.zeroStockVariants],
    ["Orders this week", overview.ordersThisWeek],
  ];
  return (
    <section>
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">Overview</p>
      <h1 className="mt-2 font-display text-5xl">Good morning.</h1>
      {overview.totalPerfumes === 0 ? (
        <EmptyState
          className="mt-8"
          eyebrow="Catalogue empty"
          title="Start with the first perfume."
          description="The public site is safely showing its catalogue-in-preparation state. Add a perfume here when confirmed product details are ready."
        >
          <Link
            href={siteConfig.routes.adminNewPerfume}
            className="bg-jp-admin-action px-4 py-3 text-sm font-semibold text-white"
          >
            Add perfume
          </Link>
        </EmptyState>
      ) : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={String(label)} className="border bg-jp-admin-surface p-5">
            <p className="text-sm text-jp-text-secondary">{label}</p>
            <strong className="mt-4 block font-display text-5xl">{value}</strong>
          </div>
        ))}
      </div>
      <div className="mt-7 grid gap-7 xl:grid-cols-[1fr_22rem]">
        <section className="border bg-jp-admin-surface p-6">
          <div className="flex justify-between">
            <h2 className="font-display text-3xl">Recent orders</h2>
            <Link href={siteConfig.routes.adminOrders} className="text-sm">
              View all
            </Link>
          </div>
          {overview.recentOrders.length ? (
            <div className="mt-4 divide-y">
              {overview.recentOrders.map((order) => (
                <Link
                  href={siteConfig.routes.adminOrder(order.reference)}
                  key={order.reference}
                  className="flex justify-between gap-4 py-4 text-sm"
                >
                  <span>
                    <strong>{order.reference}</strong>
                    <br />
                    <span className="text-jp-text-secondary">{order.customerName}</span>
                  </span>
                  <span className="text-right">
                    {formatNairaFromMinor(order.subtotalMinor)}
                    <br />
                    <span className="text-xs text-jp-text-secondary">
                      {statusLabel(order.status)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-jp-text-secondary">
              No orders yet. New orders will appear here after checkout.
            </p>
          )}
        </section>
        <section className="border bg-jp-admin-surface p-6">
          <h2 className="font-display text-3xl">Current Bestseller</h2>
          <p className="mt-4 text-sm">{overview.bestseller?.name ?? "No Bestseller selected."}</p>
          <div className="mt-5">{bestseller}</div>
        </section>
        <section className="border bg-jp-admin-surface p-6 xl:col-span-2">
          <div className="flex justify-between">
            <h2 className="font-display text-3xl">Catalogue attention</h2>
            <Link href={siteConfig.routes.adminPerfumes} className="text-sm">
              Manage perfumes
            </Link>
          </div>
          {overview.attention.length ? (
            <ul className="mt-4 divide-y">
              {overview.attention.map((perfume) => (
                <li key={perfume.id} className="flex justify-between py-3 text-sm">
                  <span>{perfume.name}</span>
                  <span className="text-jp-text-secondary">
                    {perfume.status === "DRAFT" ? "Draft" : "Out of stock"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-jp-text-secondary">
              {overview.totalPerfumes === 0
                ? "Nothing to review until the first perfume is added."
                : "No catalogue attention needed."}
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
