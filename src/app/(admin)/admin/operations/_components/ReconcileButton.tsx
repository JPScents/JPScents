"use client";

import { useActionState } from "react";

import { reconcileAdminCommerce } from "../_actions/reconcile.action";

export function ReconcileButton({
  kind,
  id,
  label,
}: {
  kind: "batch" | "payment" | "refund" | "email";
  id?: string;
  label: string;
}) {
  const [state, action, pending] = useActionState(reconcileAdminCommerce, { message: "" });
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="kind" value={kind} />
      {id ? <input type="hidden" name="id" value={id} /> : null}
      <button
        type="submit"
        disabled={pending}
        className="border px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Checking…" : label}
      </button>
      {state.message ? (
        <p role={state.error ? "alert" : "status"} className="text-sm">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
