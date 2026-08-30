"use client";

import Image from "next/image";
import { forwardRef } from "react";
import { Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { useCart } from "../CartProvider";

function issueText(issue?: string, stock?: number) {
  return issue === "missing"
    ? "This perfume is no longer available."
    : issue === "unavailable"
      ? "This size is currently out of stock."
      : `Only ${stock ?? 0} available — reduce the quantity.`;
}

function QuantityStepper({ line }: { line: ReturnType<typeof useCart>["lines"][number] }) {
  const { changeQuantity } = useCart();
  const maximum = line.stock ?? 0;
  return (
    <div className="flex h-10 items-center border">
      <button
        type="button"
        className="grid size-10 place-items-center disabled:opacity-40"
        onClick={() => changeQuantity(line.perfumeVariantId, line.requestedQuantity - 1)}
        disabled={line.requestedQuantity <= 1}
        aria-label={`Decrease quantity for ${line.name ?? "unavailable item"}`}
      >
        <Minus className="size-4" />
      </button>
      <output className="grid w-9 place-items-center text-sm" aria-live="polite">
        {line.requestedQuantity}
      </output>
      <button
        type="button"
        className="grid size-10 place-items-center disabled:opacity-40"
        onClick={() => changeQuantity(line.perfumeVariantId, line.requestedQuantity + 1)}
        disabled={!line.isValid || line.requestedQuantity >= maximum}
        aria-label={`Increase quantity for ${line.name ?? "unavailable item"}`}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export const CartLine = forwardRef<
  HTMLElement,
  { line: ReturnType<typeof useCart>["lines"][number] }
>(function CartLine({ line }, ref) {
  const { removeItem, changeQuantity } = useCart();
  const reduceMotion = useReducedMotion();
  const name = line.name ?? "Unavailable perfume";
  return (
    <motion.article
      ref={ref}
      layout="position"
      initial={reduceMotion ? false : { opacity: 0.99, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
      className="flex gap-4 border-b py-5"
    >
      <div className="relative h-28 w-22 shrink-0 overflow-hidden bg-jp-stone">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.imageAlt || ""}
            fill
            unoptimized
            sizes="88px"
            className="object-contain"
          />
        ) : (
          <ProductBottlePlaceholder />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl leading-none">{name}</h2>
            {line.sizeLabel ? (
              <p className="mt-2 text-sm text-jp-text-secondary">{line.sizeLabel}</p>
            ) : null}
          </div>
          {line.unitPriceMinor !== undefined ? (
            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-[.12em] text-jp-text-secondary">
                Unit price
              </p>
              <p className="mt-1 text-sm font-semibold">
                {formatNairaFromMinor(line.unitPriceMinor)}
              </p>
            </div>
          ) : null}
        </div>
        {line.isValid ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <QuantityStepper line={line} />
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[.12em] text-jp-text-secondary">
                Line total
              </p>
              <p className="mt-1 text-sm font-medium">
                {formatNairaFromMinor(line.lineAmountMinor)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-destructive" role="alert">
              {issueText(line.issue, line.stock)}
            </p>
            {line.issue === "over-quantity" && line.stock ? (
              <button
                type="button"
                className="mt-2 text-sm underline"
                onClick={() => changeQuantity(line.perfumeVariantId, line.stock ?? 1)}
              >
                Set quantity to {line.stock}
              </button>
            ) : null}
          </div>
        )}
        <button
          type="button"
          className="mt-3 text-[11px] uppercase tracking-[.12em] text-jp-text-secondary underline"
          onClick={() => removeItem(line.perfumeVariantId)}
          aria-label={`Remove ${name} from cart`}
        >
          Remove
        </button>
      </div>
    </motion.article>
  );
});
