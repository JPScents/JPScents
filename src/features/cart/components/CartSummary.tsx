"use client";

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { useCart } from "../CartProvider";

export function CartSummary({ preview = false }: { preview?: boolean }) {
  const { count, subtotalMinor, hasInvalidLines, resolutionState, setOpen } = useCart();
  const blockedMessage =
    resolutionState === "resolving"
      ? "Checking current availability…"
      : resolutionState === "error"
        ? "Cart availability could not be checked. Try again before Checkout."
        : hasInvalidLines
          ? "Resolve unavailable items before Checkout."
          : undefined;
  if (preview)
    return (
      <section className="border-t pt-4" aria-label="Cart subtotal">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold">Subtotal</span>
          <strong className="font-display text-3xl">{formatNairaFromMinor(subtotalMinor)}</strong>
        </div>
        {blockedMessage ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {blockedMessage}
          </p>
        ) : null}
        <Link
          href={siteConfig.routes.checkout}
          aria-disabled={hasInvalidLines}
          onClick={(event) => {
            if (hasInvalidLines) {
              event.preventDefault();
              return;
            }
            setOpen(false);
          }}
          className={`mt-4 flex h-12 items-center justify-center bg-jp-text-primary text-sm font-semibold uppercase tracking-[.08em] text-jp-surface ${hasInvalidLines ? "pointer-events-none opacity-45" : ""}`}
        >
          Checkout
        </Link>
      </section>
    );
  return (
    <section className="border bg-jp-surface p-6 lg:sticky lg:top-6" aria-label="Order summary">
      <p className="text-xs font-semibold uppercase tracking-[.15em] text-jp-olive">
        Order summary
      </p>
      <div className="mt-6 flex justify-between text-sm">
        <span>Items</span>
        <span>{count}</span>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span>Subtotal</span>
        <strong className="font-display text-3xl">{formatNairaFromMinor(subtotalMinor)}</strong>
      </div>
      <p className="mt-5 text-xs leading-5 text-jp-text-secondary">
        Availability is checked again when you place your order. Payment is not taken online.
      </p>
      {blockedMessage ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {blockedMessage}
        </p>
      ) : null}
      <Link
        href={siteConfig.routes.checkout}
        aria-disabled={hasInvalidLines}
        onClick={(event) => {
          if (hasInvalidLines) event.preventDefault();
        }}
        className={`mt-6 flex h-13 items-center justify-center bg-jp-text-primary text-sm font-semibold uppercase tracking-[.08em] text-jp-surface ${hasInvalidLines ? "pointer-events-none opacity-45" : ""}`}
      >
        Checkout
      </Link>
    </section>
  );
}
