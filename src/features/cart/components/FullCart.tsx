"use client";

import Link from "next/link";
import { AnimatePresence } from "motion/react";

import { siteConfig } from "@/config/site";

import { useCart } from "../CartProvider";
import { CartLine } from "./CartLine";
import { CartSummary } from "./CartSummary";

export function FullCart() {
  const { lines, count, resolutionState } = useCart();
  if (count && resolutionState === "resolving")
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-16 lg:px-public-gutter-desktop">
        <h1 className="font-display text-6xl">Your cart</h1>
        <p className="mt-5 text-jp-text-secondary" role="status">
          Checking current availability…
        </p>
      </section>
    );
  if (count && resolutionState === "error")
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-16 lg:px-public-gutter-desktop">
        <h1 className="font-display text-6xl">Your cart</h1>
        <p className="mt-5 text-destructive" role="alert">
          We could not check your cart. Please reload before Checkout.
        </p>
        <CartSummary />
      </section>
    );
  if (!lines.length && count === 0)
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-16 lg:px-public-gutter-desktop lg:py-24">
        <div className="border-b pb-7">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-jp-text-secondary">
            Your cart
          </p>
          <h1 className="mt-3 font-display text-6xl">Nothing here yet.</h1>
        </div>
        <div className="mt-8 flex flex-col justify-between gap-8 bg-jp-stone p-8 lg:flex-row lg:items-center lg:p-14">
          <div className="max-w-xl">
            <h2 className="font-display text-5xl">Start with a perfume you’d like to try.</h2>
            <p className="mt-4 text-jp-text-secondary">
              Browse available perfumes, choose a size, and add it to your cart. You can continue
              browsing before checkout.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={siteConfig.routes.perfumes}
              className="bg-jp-text-primary px-6 py-3 text-sm font-semibold text-jp-surface"
            >
              Browse Perfumes
            </Link>
            <Link
              href={siteConfig.routes.helpMeChoose}
              className="border border-jp-text-primary px-6 py-3 text-sm font-semibold"
            >
              Find My Scent
            </Link>
          </div>
        </div>
      </section>
    );
  return (
    <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-16">
      <div className="flex items-end justify-between border-b pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-jp-olive">
            Your cart
          </p>
          <h1 className="mt-3 font-display text-6xl lg:text-7xl">Review your choices.</h1>
        </div>
        <p className="text-sm text-jp-text-secondary">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <AnimatePresence initial={false}>
            {lines.map((line) => (
              <CartLine key={line.perfumeVariantId} line={line} />
            ))}
          </AnimatePresence>
          <Link
            href={siteConfig.routes.perfumes}
            className="mt-6 inline-block text-sm font-semibold uppercase tracking-[.08em]"
          >
            ← Continue Browsing
          </Link>
        </div>
        <CartSummary />
      </div>
    </section>
  );
}
