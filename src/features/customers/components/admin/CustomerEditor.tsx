"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";

import { ModalShell } from "@/components/shared/ModalShell";
import { siteConfig } from "@/config/site";

import { deleteCustomerAdmin } from "../../actions/delete-customer.admin.action";
import {
  saveCustomerAdmin,
  type CustomerActionState,
} from "../../actions/save-customer.admin.action";

type CustomerEditorRecord = {
  id: string;
  name: string;
  whatsappNumber: string;
  email: string | null;
  deliveryState: string;
  deliveryCity: string;
  deliveryAddress: string;
  orders: Array<{
    reference: string;
    status: string;
    subtotalMinor: number;
    createdAt: Date;
    _count: { items: number };
  }>;
};

const initial: CustomerActionState = {};

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
      {error ? (
        <span role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function CustomerEditor({ customer }: { customer?: CustomerEditorRecord }) {
  const [state, action, pending] = useActionState(saveCustomerAdmin, initial);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState("");
  const [deleting, startDelete] = useTransition();
  const router = useRouter();
  return (
    <section className="max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">
            Customers / {customer ? "Edit" : "New"}
          </p>
          <h1 className="mt-2 font-display text-5xl">
            {customer ? customer.name : "Add customer"}
          </h1>
        </div>
        {customer ? (
          <button
            className="border border-destructive px-4 py-3 text-sm font-semibold text-destructive disabled:opacity-45"
            disabled={Boolean(customer.orders.length)}
            type="button"
            onClick={() => {
              setDeleteMessage("");
              setDeleteOpen(true);
            }}
          >
            Delete customer
          </button>
        ) : null}
      </div>
      {customer?.orders.length ? (
        <p className="mt-4 text-sm text-jp-text-secondary">
          Customers with order history cannot be deleted.
        </p>
      ) : null}
      <form
        action={action}
        className="mt-8 grid gap-5 border bg-jp-admin-surface p-5 sm:grid-cols-2"
      >
        <input name="id" type="hidden" value={customer?.id ?? ""} />
        <Field label="Name" error={state.errors?.name}>
          <input name="name" defaultValue={customer?.name} className="h-11 border bg-white px-3" />
        </Field>
        <Field label="WhatsApp number" error={state.errors?.whatsappNumber}>
          <input
            name="whatsappNumber"
            defaultValue={customer?.whatsappNumber}
            inputMode="tel"
            className="h-11 border bg-white px-3"
          />
        </Field>
        <Field label="Email (optional)" error={state.errors?.email}>
          <input
            name="email"
            defaultValue={customer?.email ?? ""}
            type="email"
            className="h-11 border bg-white px-3"
          />
        </Field>
        <Field label="State" error={state.errors?.deliveryState}>
          <input
            name="deliveryState"
            defaultValue={customer?.deliveryState}
            className="h-11 border bg-white px-3"
          />
        </Field>
        <Field label="City" error={state.errors?.deliveryCity}>
          <input
            name="deliveryCity"
            defaultValue={customer?.deliveryCity}
            className="h-11 border bg-white px-3"
          />
        </Field>
        <Field label="Delivery address" error={state.errors?.deliveryAddress}>
          <textarea
            name="deliveryAddress"
            defaultValue={customer?.deliveryAddress}
            className="min-h-28 border bg-white p-3"
          />
        </Field>
        {state.errors?.form ? (
          <p className="sm:col-span-2" role="alert">
            {state.errors.form}
          </p>
        ) : null}
        <button
          disabled={pending}
          className="h-11 bg-jp-admin-action px-4 text-sm font-semibold text-white sm:col-span-2"
          type="submit"
        >
          {pending ? "Saving…" : customer ? "Save customer" : "Create customer"}
        </button>
      </form>
      {customer ? (
        <section className="mt-8 border bg-jp-admin-surface p-5">
          <h2 className="font-display text-3xl">Order history</h2>
          {customer.orders.length ? (
            <ul className="mt-5 divide-y border-t">
              {customer.orders.map((order) => (
                <li
                  key={order.reference}
                  className="flex flex-wrap justify-between gap-3 py-4 text-sm"
                >
                  <a
                    className="font-semibold underline"
                    href={siteConfig.routes.adminOrder(order.reference)}
                  >
                    {order.reference}
                  </a>
                  <span>{order._count.items} items</span>
                  <span>{order.status}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-jp-text-secondary">No orders yet.</p>
          )}
        </section>
      ) : null}
      <ModalShell
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteOpen(open);
        }}
        title="Delete this customer?"
        description="This customer has no orders. Deleting the record cannot be undone."
      >
        <div className="flex flex-wrap justify-end gap-3">
          <button
            className="h-10 border border-jp-admin-border px-4 text-sm font-semibold"
            disabled={deleting}
            type="button"
            onClick={() => setDeleteOpen(false)}
          >
            Cancel
          </button>
          <button
            className="h-10 bg-destructive px-4 text-sm font-semibold text-white"
            disabled={deleting}
            type="button"
            onClick={() =>
              startDelete(async () => {
                const result = await deleteCustomerAdmin(customer!.id);
                if ("ok" in result) {
                  router.replace(siteConfig.routes.adminCustomers);
                  return;
                }
                setDeleteMessage(result.error ?? "Unable to delete this customer.");
              })
            }
          >
            {deleting ? "Deleting…" : "Delete customer"}
          </button>
        </div>
        {deleteMessage ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {deleteMessage}
          </p>
        ) : null}
      </ModalShell>
    </section>
  );
}
