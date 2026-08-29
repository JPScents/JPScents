"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { siteConfig } from "@/config/site";

import { useCart } from "../CartProvider";

export function CartUtility() {
  const { count, setOpen } = useCart();
  const contents = (
    <>
      <ShoppingBag className="size-5" aria-hidden="true" />
      <span
        className="grid size-6 place-items-center rounded-full border border-[#beb7aa] text-[11px] font-semibold"
        aria-live="polite"
      >
        {count}
      </span>
    </>
  );
  return count ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2"
      aria-label={`Open cart, ${count} items`}
    >
      {contents}
    </button>
  ) : (
    <Link
      href={siteConfig.routes.cart}
      className="inline-flex items-center gap-2"
      aria-label="Open cart, 0 items"
    >
      {contents}
    </Link>
  );
}
