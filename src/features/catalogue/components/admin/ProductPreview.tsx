"use client";

import Image from "next/image";
import { useState } from "react";

import { ModalShell } from "@/components/shared/ModalShell";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

export function ProductPreview({
  open,
  onOpenChange,
  form,
  imageUrl,
  variants,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: React.RefObject<HTMLFormElement | null>;
  imageUrl?: string;
  variants: Array<{ priceMinor: number; quantity: number }>;
}) {
  const [compact, setCompact] = useState(false);
  const input = (name: string) =>
    (form.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)
      ?.value ?? "";
  const available = variants.some((variant) => variant.quantity > 0);
  const startingPrice = variants.length
    ? Math.min(...variants.map((variant) => variant.priceMinor))
    : 0;
  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title="Product preview"
      description="Unsaved state only — this never changes the catalogue."
    >
      <div className="flex justify-end">
        <button
          type="button"
          aria-pressed={compact}
          onClick={() => setCompact(!compact)}
          className="border border-jp-admin-border px-3 py-2 text-sm"
        >
          {compact ? "Show large card" : "Show compact card"}
        </button>
      </div>
      <article className={compact ? "mt-4 flex gap-4 border p-4" : "mt-4 border p-5"}>
        <div
          className={
            compact
              ? "h-28 w-24 shrink-0 bg-jp-stone"
              : "flex h-64 items-center justify-center bg-jp-stone"
          }
        >
          {imageUrl ? (
            <Image
              unoptimized
              src={imageUrl}
              alt={input("primaryImageAlt") || `${input("name") || "Perfume"} bottle`}
              width={600}
              height={600}
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="text-sm text-jp-text-secondary">Primary image</span>
          )}
        </div>
        <div className={compact ? "min-w-0" : "mt-5"}>
          <p className="text-[11px] uppercase tracking-[.14em] text-jp-text-secondary">
            {available ? "Available" : "Unavailable"}
          </p>
          <h2 className="font-display text-3xl">{input("name") || "Untitled perfume"}</h2>
          <p className="mt-1 text-sm text-jp-text-secondary">
            {input("scentCue") || "A short scent cue will appear here."}
          </p>
          <p className="mt-3 text-sm font-semibold">
            {variants.length
              ? `From ${formatNairaFromMinor(startingPrice)}`
              : "Price to be confirmed"}
          </p>
        </div>
      </article>
    </ModalShell>
  );
}
