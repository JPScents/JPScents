"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { useCart } from "@/features/cart";

type Variant = {
  id: string;
  sizeLabel: string;
  price: string;
  quantity: number;
  isAvailable: boolean;
};

export function VariantPurchaseControls({ variants }: { variants: Variant[] }) {
  const available = variants.filter((variant) => variant.isAvailable);
  const [selectedId, setSelectedId] = useState(
    available.length === 1 ? available[0]?.id : undefined,
  );
  const [quantity, setQuantity] = useState(1);
  const selected = variants.find((variant) => variant.id === selectedId);
  const reduceMotion = useReducedMotion();
  const { addItem } = useCart();

  function selectVariant(id: string) {
    setSelectedId(id);
    setQuantity(1);
  }

  function addSelectedVariant() {
    if (selected) addItem(selected.id, quantity, selected.quantity);
  }

  return (
    <section className="mt-8" aria-labelledby="size-heading">
      <div className="flex items-baseline justify-between">
        <h2 id="size-heading" className="font-display text-3xl">
          Choose your size
        </h2>
        {selected ? <p className="text-sm font-medium">{selected.price}</p> : null}
      </div>
      <fieldset className="mt-4 flex flex-wrap gap-2" aria-label="Available sizes">
        <legend className="sr-only">Size</legend>
        {variants.map((variant) => (
          <motion.label
            key={variant.id}
            whileTap={reduceMotion ? undefined : { scale: 0.98 }}
            className={`flex min-w-32 cursor-pointer items-center justify-between gap-4 border px-4 py-3 ${selectedId === variant.id ? "border-jp-text-primary bg-jp-stone" : ""} ${!variant.isAvailable ? "cursor-not-allowed opacity-55" : ""}`}
          >
            <span>{variant.sizeLabel}</span>
            <span className="text-sm">{variant.isAvailable ? variant.price : "Out of stock"}</span>
            <input
              type="radio"
              className="sr-only"
              name="variant"
              checked={selectedId === variant.id}
              disabled={!variant.isAvailable}
              onChange={() => selectVariant(variant.id)}
            />
          </motion.label>
        ))}
      </fieldset>
      {selected ? (
        <div className="mt-6 flex items-center justify-between border-y py-4">
          <div>
            <p className="font-medium">Quantity</p>
            <p className="text-sm text-jp-text-secondary" aria-live="polite">
              {selected.quantity} available
            </p>
          </div>
          <div className="flex items-center border">
            <motion.button
              type="button"
              className="grid size-11 place-items-center disabled:opacity-40"
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              aria-label="Decrease quantity"
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            >
              <Minus className="size-4" />
            </motion.button>
            <output className="grid size-10 place-items-center" aria-live="polite">
              {quantity}
            </output>
            <motion.button
              type="button"
              className="grid size-11 place-items-center disabled:opacity-40"
              disabled={quantity >= selected.quantity}
              onClick={() => setQuantity((value) => Math.min(selected.quantity, value + 1))}
              aria-label="Increase quantity"
              whileTap={reduceMotion ? undefined : { scale: 0.94 }}
            >
              <Plus className="size-4" />
            </motion.button>
          </div>
        </div>
      ) : (
        <p className="mt-5 text-sm text-jp-text-secondary">Select an available size to continue.</p>
      )}
      <motion.button
        type="button"
        disabled={!selected}
        onClick={addSelectedVariant}
        className="mt-6 w-full bg-jp-text-primary px-5 py-4 text-sm font-medium text-jp-surface disabled:cursor-not-allowed disabled:opacity-40"
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
      >
        Add to Cart
      </motion.button>
    </section>
  );
}
