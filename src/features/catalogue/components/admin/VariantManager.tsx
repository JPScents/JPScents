"use client";

import { useActionState, useState } from "react";
import { ModalShell } from "@/components/shared/ModalShell";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";
import {
  deleteVariant,
  saveVariant,
  type VariantActionState,
} from "../../actions/variants.admin.action";

type Variant = {
  id: string;
  sizeValue: { toString(): string };
  priceMinor: number;
  quantity: number;
};
const initial: VariantActionState = {};

function VariantField({
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

export function VariantManager({
  perfumeId,
  variants,
}: {
  perfumeId: string;
  variants: Variant[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Variant | null>(null);
  const [state, action, pending] = useActionState(
    async (previous: VariantActionState, formData: FormData) => {
      const result = await saveVariant(previous, formData);
      if (result.ok) setOpen(false);
      return result;
    },
    initial,
  );
  const [deleted, deleteAction] = useActionState(deleteVariant, initial);
  const begin = (variant?: Variant) => {
    setEditing(variant ?? null);
    setOpen(true);
  };
  return (
    <section className="border-t pt-7">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Variants</h2>
          <p className="mt-1 text-sm text-jp-text-secondary">
            Current sellable sizes and quantities.
          </p>
        </div>
        <button
          className="h-10 bg-jp-admin-action px-4 text-sm text-white"
          type="button"
          onClick={() => begin()}
        >
          Add variant
        </button>
      </div>
      {variants.length ? (
        <div className="mt-4 divide-y border border-jp-admin-border">
          {variants.map((variant) => (
            <div
              className="grid gap-3 p-4 text-sm sm:grid-cols-[1fr_1fr_1fr_auto]"
              key={variant.id}
            >
              <span>{variant.sizeValue.toString()} mL</span>
              <span>{formatNairaFromMinor(variant.priceMinor)}</span>
              <span>{variant.quantity ? `${variant.quantity} in stock` : "Out of stock"}</span>
              <span>
                <button type="button" className="underline" onClick={() => begin(variant)}>
                  Edit
                </button>
                <form
                  className="inline"
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm("Delete this unreferenced variant? This cannot be undone."))
                      event.preventDefault();
                  }}
                >
                  <input type="hidden" name="id" value={variant.id} />
                  <input type="hidden" name="perfumeId" value={perfumeId} />
                  <button className="ml-3 text-destructive underline" type="submit">
                    Delete
                  </button>
                </form>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 border border-dashed border-jp-admin-border p-5 text-sm text-jp-text-secondary">
          No variants yet. Add a sellable size to publish this perfume.
        </p>
      )}
      {deleted.message ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {deleted.message}
        </p>
      ) : null}
      <ModalShell
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Edit variant" : "Add variant"}
        description="Size is measured in mL; prices are entered in NGN."
      >
        <form action={action} className="grid gap-4">
          <input type="hidden" name="perfumeId" value={perfumeId} />
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          <VariantField label="Size (mL)" error={state.errors?.sizeValue}>
            <input
              name="sizeValue"
              inputMode="decimal"
              className="h-10 border border-jp-admin-border px-3"
              defaultValue={editing?.sizeValue.toString()}
              aria-invalid={Boolean(state.errors?.sizeValue)}
            />
          </VariantField>
          <VariantField label="Price (NGN)" error={state.errors?.price}>
            <input
              name="price"
              inputMode="decimal"
              className="h-10 border border-jp-admin-border px-3"
              defaultValue={editing ? (editing.priceMinor / 100).toFixed(2) : ""}
              aria-invalid={Boolean(state.errors?.price)}
            />
          </VariantField>
          <VariantField label="Quantity" error={state.errors?.quantity}>
            <input
              name="quantity"
              inputMode="numeric"
              className="h-10 border border-jp-admin-border px-3"
              defaultValue={editing?.quantity}
              aria-invalid={Boolean(state.errors?.quantity)}
            />
          </VariantField>
          {state.message || state.errors?.form ? (
            <p role="alert" className="text-sm text-destructive">
              {state.message ?? state.errors?.form}
            </p>
          ) : null}
          <button disabled={pending} className="h-10 bg-jp-admin-action text-white" type="submit">
            {pending ? "Saving…" : "Save variant"}
          </button>
        </form>
      </ModalShell>
    </section>
  );
}
