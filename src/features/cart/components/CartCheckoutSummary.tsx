"use client";

import Link from "next/link";

import { siteConfig } from "@/config/site";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { useCart } from "../CartProvider";

export function CartCheckoutSummary({ preview = false }: { preview?: boolean }) {
  const { count, subtotalMinor, hasInvalidLines, resolutionState, setOpen, refreshCart } =
    useCart();
  const isChecking = resolutionState === "loading" || resolutionState === "resolving";
  const blockedMessage = isChecking
    ? "Checking current availability…"
    : resolutionState === "error"
      ? "Cart availability could not be checked. Try again before Checkout."
      : hasInvalidLines
        ? "Resolve unavailable items before Checkout."
        : undefined;

  return (
    <section
      className={preview ? "border-t pt-4" : "border bg-jp-surface p-6 lg:sticky lg:top-6"}
      aria-label={preview ? "Cart subtotal" : "Order summary"}
    >
      {!preview ? (
        <>
          <p className="text-xs font-semibold uppercase tracking-[.15em] text-jp-olive">
            Order summary
          </p>
          <div className="mt-6 flex justify-between text-sm">
            <span>Items</span>
            <span>{count}</span>
          </div>
        </>
      ) : null}
      <div className={`flex items-baseline justify-between ${preview ? "" : "mt-3"}`}>
        <span className={preview ? "text-sm font-semibold" : undefined}>Subtotal</span>
        <strong className="font-display text-3xl">{formatNairaFromMinor(subtotalMinor)}</strong>
      </div>
      {!preview ? (
        <p className="mt-5 text-xs leading-5 text-jp-text-secondary">
          Availability is checked again when you place your order. Payment is not taken online.
        </p>
      ) : null}
      {blockedMessage ? (
        <p
          className={`mt-3 text-sm ${isChecking ? "text-jp-text-secondary" : "text-destructive"}`}
          role={isChecking ? "status" : "alert"}
        >
          {blockedMessage}
        </p>
      ) : null}
      {resolutionState === "error" ? (
        <button type="button" onClick={refreshCart} className="mt-2 text-sm underline">
          Retry availability check
        </button>
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
        className={`flex items-center justify-center bg-jp-text-primary text-sm font-semibold uppercase tracking-[.08em] text-jp-surface ${preview ? "mt-4 h-12" : "mt-6 h-13"} ${hasInvalidLines ? "pointer-events-none opacity-45" : ""}`}
      >
        Checkout
      </Link>
    </section>
  );
}
