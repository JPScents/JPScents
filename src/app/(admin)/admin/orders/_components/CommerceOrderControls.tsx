"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { parseNairaToMinor } from "@/modules/catalogue";
import { formatEnumLabel } from "@/shared/utils/format-enum-label";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { updateCommerceOrder } from "../_actions/update-commerce-order.action";

type Controls = {
  id: string;
  status: string | null;
  fulfilment: string | null;
  refundableMinor: number;
  items: Array<{ perfumeVariantId: string; name: string; quantity: number }>;
};
const nextStatus: Record<string, string> = {
  UNFULFILLED: "PROCESSING",
  PROCESSING: "DISPATCHED",
  DISPATCHED: "DELIVERED",
};

export function CommerceOrderControls({
  id,
  status,
  fulfilment,
  refundableMinor,
  items,
}: Controls) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; error?: boolean }>();
  const keys = useRef(new Map<string, string>());
  const next = status === "PAID" && fulfilment ? nextStatus[fulfilment] : undefined;
  const dispatched = fulfilment === "DISPATCHED" || fulfilment === "DELIVERED";
  const canCancel = !dispatched && status !== "CANCELLED";

  function run(command: Record<string, unknown>) {
    const identity = JSON.stringify(command);
    const requestKey = keys.current.get(identity) ?? crypto.randomUUID();
    keys.current.set(identity, requestKey);
    start(async () => {
      setFeedback(undefined);
      try {
        const result = await updateCommerceOrder({ ...command, id, requestKey });
        if ("error" in result && result.error) {
          setFeedback({ error: true, message: result.error });
          return;
        }
        keys.current.delete(identity);
        setFeedback({ message: "Order updated." });
        router.refresh();
      } catch {
        setFeedback({
          error: true,
          message: "The order could not be updated. Retry to check the same request.",
        });
      }
    });
  }

  function submit(event: FormEvent<HTMLFormElement>, action: "CANCEL" | "REFUND" | "RETURN") {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run({
      action,
      reason: form.get("reason"),
      amountMinor: parseNairaToMinor(String(form.get("amount") ?? "")),
      perfumeVariantId: form.get("variant"),
      quantity: Number(form.get("quantity")),
    });
  }

  return (
    <section aria-label="Order actions" className="space-y-5 border bg-jp-surface p-5">
      <h2 className="font-display text-2xl">Order actions</h2>
      {next ? (
        <button
          type="button"
          className="border px-3 py-2 text-sm"
          disabled={pending}
          onClick={() => run({ action: "FULFIL", next })}
        >
          Mark {formatEnumLabel(next)}
        </button>
      ) : null}
      {canCancel ? (
        <form className="space-y-2 border-t pt-3" onSubmit={(event) => submit(event, "CANCEL")}>
          <fieldset disabled={pending} className="space-y-2">
            <legend className="font-semibold">Cancel before dispatch</legend>
            <p className="text-sm">
              Cancellation releases eligible stock and requests a full refund of any verified
              payment, including delivery.
            </p>
            <label className="grid gap-1 text-sm">
              Cancellation reason
              <input name="reason" required maxLength={240} className="border px-3 py-2" />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" required /> Confirm cancellation and any full refund
            </label>
            <button type="submit" className="border px-3 py-2 text-sm">
              Cancel order
            </button>
          </fieldset>
        </form>
      ) : null}
      {dispatched ? (
        <>
          <form className="border-t pt-3" onSubmit={(event) => submit(event, "REFUND")}>
            <fieldset disabled={pending || refundableMinor <= 0} className="space-y-2">
              <legend className="font-semibold">Request refund</legend>
              <p className="text-sm">Refundable balance {formatNairaFromMinor(refundableMinor)}</p>
              <label className="grid gap-1 text-sm">
                Refund amount (NGN)
                <input inputMode="decimal" name="amount" required className="border px-3 py-2" />
              </label>
              <label className="grid gap-1 text-sm">
                Refund reason
                <input name="reason" required maxLength={240} className="border px-3 py-2" />
              </label>
              <button type="submit" className="border px-3 py-2 text-sm">
                Request refund
              </button>
            </fieldset>
          </form>
          <form className="border-t pt-3" onSubmit={(event) => submit(event, "RETURN")}>
            <fieldset disabled={pending} className="space-y-2">
              <legend className="font-semibold">Record a received saleable return</legend>
              <label className="grid gap-1 text-sm">
                Returned item
                <select name="variant" required className="border px-3 py-2">
                  <option value="">Choose an item</option>
                  {items.map((line) => (
                    <option key={line.perfumeVariantId} value={line.perfumeVariantId}>
                      {line.name} · {line.quantity} sold
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Received quantity
                <input
                  name="quantity"
                  type="number"
                  required
                  min={1}
                  max={99}
                  className="border px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                Return reason
                <input name="reason" required maxLength={240} className="border px-3 py-2" />
              </label>
              <button type="submit" className="border px-3 py-2 text-sm">
                Record received return
              </button>
            </fieldset>
          </form>
        </>
      ) : null}
      {pending ? (
        <p role="status" className="text-sm">
          Saving order action…
        </p>
      ) : null}
      {feedback ? (
        <p role={feedback.error ? "alert" : "status"} className="text-sm">
          {feedback.message}
        </p>
      ) : null}
    </section>
  );
}
