"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { AnimatePresence } from "motion/react";

import {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";

import { useCart } from "../CartProvider";
import { CartLine } from "./CartLine";
import { CartSummary } from "./CartSummary";

function useDesktopViewport() {
  return useSyncExternalStore(
    (notify) => {
      if (!window.matchMedia) return () => undefined;
      const query = window.matchMedia("(min-width: 1024px)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia?.("(min-width: 1024px)").matches ?? false,
    () => false,
  );
}

export function CartPreview() {
  const { isOpen, setOpen, lines, count, resolutionState } = useCart();
  const isDesktop = useDesktopViewport();
  const focusBeforeOpen = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (isOpen)
      focusBeforeOpen.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (wasOpen.current && !isOpen) focusBeforeOpen.current?.focus();
    wasOpen.current = isOpen;
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        animation={isDesktop ? "from-right" : "from-bottom"}
        className="inset-y-0 right-0 left-auto flex h-full w-full max-w-[31rem] translate-x-0 translate-y-0 flex-col overflow-y-auto border-y-0 border-r-0 p-6 sm:p-8 max-lg:inset-x-0 max-lg:top-auto max-lg:h-auto max-lg:max-h-[78vh] max-lg:max-w-none max-lg:rounded-t-sheet"
      >
        <p className="text-xs font-semibold uppercase tracking-[.15em] text-jp-olive">
          Added to cart
        </p>
        <DialogTitle className="mt-2">Your cart</DialogTitle>
        <DialogDescription className="sr-only">Review items in your cart.</DialogDescription>
        <DialogCloseButton />
        {resolutionState === "resolving" && count ? (
          <p className="mt-6 text-sm text-jp-text-secondary" role="status">
            Checking your cart…
          </p>
        ) : resolutionState === "error" && count ? (
          <p className="mt-6 text-sm text-destructive" role="alert">
            We could not check your cart. Checkout is unavailable until it is resolved.
          </p>
        ) : lines.length ? (
          <div className="mt-5">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <CartLine key={line.perfumeVariantId} line={line} />
              ))}
            </AnimatePresence>
            <CartSummary preview />
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <DialogClose asChild>
                <Link
                  href={siteConfig.routes.perfumes}
                  className="flex h-11 items-center justify-center border text-sm font-semibold"
                >
                  Continue Browsing
                </Link>
              </DialogClose>
              <DialogClose asChild>
                <Link
                  href={siteConfig.routes.cart}
                  className="flex h-11 items-center justify-center border text-sm font-semibold"
                >
                  View Full Cart
                </Link>
              </DialogClose>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-sm text-jp-text-secondary">Your cart is empty.</p>
        )}
      </DialogContent>
    </Dialog>
  );
}
