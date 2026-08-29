"use client";

import { useState } from "react";

import { ModalShell } from "@/components/shared/ModalShell";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { parseNairaToMinor } from "../../utils/price.utils";

type StagedVariant = { sizeValue: string; price: string; quantity: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}

function VariantTable({
  variants,
  onRemove,
}: {
  variants: Array<StagedVariant & { id: string }>;
  onRemove: (index: number) => void;
}) {
  return variants.length ? (
    <div className="mt-4 divide-y border border-jp-admin-border">
      {variants.map((variant, index) => (
        <div key={variant.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_auto]">
          <span>{variant.sizeValue} mL</span>
          <span>{formatNairaFromMinor(parseNairaToMinor(variant.price) ?? 0)}</span>
          <span>{variant.quantity} in stock</span>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="text-left text-destructive underline"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  ) : (
    <div className="mt-4 border border-dashed border-jp-admin-border p-5 text-sm text-jp-text-secondary">
      No variants yet. Add a sellable size to publish this perfume.
    </div>
  );
}

export function StagedVariantManager({
  variants,
  onChange,
}: {
  variants: StagedVariant[];
  onChange: (variants: StagedVariant[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<StagedVariant>({ sizeValue: "", price: "", quantity: "" });
  const [error, setError] = useState("");
  const save = () => {
    if (
      !draft.sizeValue ||
      parseNairaToMinor(draft.price) === null ||
      !/^\d+$/.test(draft.quantity)
    ) {
      setError("Enter a positive size, valid NGN price, and whole quantity.");
      return;
    }
    if (variants.some((variant) => variant.sizeValue === draft.sizeValue)) {
      setError("Each staged variant needs a unique size.");
      return;
    }
    onChange([...variants, draft]);
    setDraft({ sizeValue: "", price: "", quantity: "" });
    setError("");
    setOpen(false);
  };
  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl">Variants</h2>
          <p className="mt-1 text-sm text-jp-text-secondary">
            Add sellable sizes before creating this perfume.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white"
        >
          Add variant
        </button>
      </div>
      <VariantTable
        variants={variants.map((variant, index) => ({ ...variant, id: String(index) }))}
        onRemove={(index) => onChange(variants.filter((_, current) => current !== index))}
      />
      <ModalShell
        open={open}
        onOpenChange={setOpen}
        title="Add variant"
        description="Size is measured in mL; prices are entered in NGN."
      >
        <div className="grid gap-4">
          <Field label="Size (mL)">
            <input
              value={draft.sizeValue}
              inputMode="decimal"
              onChange={(event) => setDraft({ ...draft, sizeValue: event.target.value })}
              className="h-10 border border-jp-admin-border px-3"
            />
          </Field>
          <Field label="Price (NGN)">
            <input
              value={draft.price}
              inputMode="decimal"
              onChange={(event) => setDraft({ ...draft, price: event.target.value })}
              className="h-10 border border-jp-admin-border px-3"
            />
          </Field>
          <Field label="Quantity">
            <input
              value={draft.quantity}
              inputMode="numeric"
              onChange={(event) => setDraft({ ...draft, quantity: event.target.value })}
              className="h-10 border border-jp-admin-border px-3"
            />
          </Field>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={save}
            className="h-10 bg-jp-admin-action text-sm font-semibold text-white"
          >
            Stage variant
          </button>
        </div>
      </ModalShell>
    </section>
  );
}
