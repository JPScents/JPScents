"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  Dialog,
  DialogClose,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import { CartPreview, CartProvider, CartUtility } from "@/features/cart";
import { cn } from "@/lib/utils";

const navigation = [
  { href: siteConfig.routes.perfumes, label: "Perfumes" },
  { href: siteConfig.routes.helpMeChoose, label: "Help me choose" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === siteConfig.routes.home;

  return (
    <CartProvider>
      <Dialog>
        <div className="min-h-screen bg-jp-canvas text-jp-text-primary">
          <header className="border-b bg-jp-surface">
            <div
              className={cn(
                "relative mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5",
                isHome ? "lg:h-[104px] lg:px-[104px]" : "lg:h-[88px] lg:px-[72px]",
              )}
            >
              <Link
                href={siteConfig.routes.home}
                className={cn(
                  "font-display text-[25px] font-medium leading-[30px] tracking-[-.02em]",
                  isHome
                    ? "lg:text-2xl lg:font-semibold"
                    : "lg:text-[30px] lg:font-semibold lg:leading-9",
                )}
              >
                JPScents
              </Link>
              <nav
                className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-12 lg:flex"
                aria-label="Primary navigation"
              >
                {navigation.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      isHome ? "text-[13px] font-medium" : "text-sm font-medium",
                      pathname === item.href && "text-jp-olive",
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.label === "Help me choose" ? "Help Me Choose" : item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-[18px]">
                <DialogTrigger asChild>
                  <button
                    className="inline-flex h-11 items-center text-[13px] font-semibold lg:hidden"
                    type="button"
                    aria-label="Open menu"
                  >
                    Menu
                  </button>
                </DialogTrigger>
                <CartUtility />
              </div>
            </div>
          </header>
          <DialogContent
            animation="from-bottom"
            className="inset-x-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-t-sheet border-x-0 border-b-0 lg:hidden"
          >
            <DialogTitle>Navigation</DialogTitle>
            <DialogDescription className="sr-only">Browse JPScents pages.</DialogDescription>
            <DialogCloseButton />
            <nav className="mt-10 grid gap-6 text-2xl" aria-label="Mobile primary navigation">
              {navigation.map((item) => (
                <DialogClose key={item.href} asChild>
                  <Link href={item.href}>{item.label}</Link>
                </DialogClose>
              ))}
            </nav>
          </DialogContent>
          <main>{children}</main>
          <footer className="bg-[#1f211d] text-white">
            <div className="mx-auto flex h-44 max-w-[1440px] flex-col justify-between px-5 py-7 lg:hidden">
              <Link
                href={siteConfig.routes.home}
                className="font-display text-[26px] font-medium leading-[30px]"
              >
                JPScents
              </Link>
              <div className="space-y-[9px] text-xs font-medium uppercase tracking-[.08em]">
                <nav
                  aria-label="Footer navigation"
                  className="flex flex-wrap gap-x-1 text-[#d9ddd3]"
                >
                  <Link href={siteConfig.routes.perfumes}>Perfumes</Link>
                  <span aria-hidden="true">·</span>
                  <Link href={siteConfig.routes.helpMeChoose}>Help Me Choose</Link>
                  <span aria-hidden="true">·</span>
                  <Link href={siteConfig.routes.cart}>Cart</Link>
                </nav>
                <p className="text-[11px] text-[#9ea399]">Perfume, chosen with care.</p>
              </div>
            </div>
            {isHome ? (
              <div className="mx-auto hidden h-[500px] max-w-[1440px] flex-col justify-between px-[104px] pb-9 pt-[76px] lg:flex">
                <div className="flex items-start justify-between">
                  <div className="w-[420px]">
                    <Link
                      href={siteConfig.routes.home}
                      className="font-display text-[30px] font-semibold leading-[34px]"
                    >
                      JPScents
                    </Link>
                    <p className="mt-4 text-[13px] leading-[22px] text-[#c9c5bb]">
                      Curated perfumes, clear choices, and a simple way to place your order.
                    </p>
                  </div>
                  <div className="flex gap-[110px]">
                    <div className="w-[150px]">
                      <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[.14em] text-[#a9a69d]">
                        Explore
                      </p>
                      <nav
                        className="mt-3.5 grid text-[13px] leading-[30px]"
                        aria-label="Footer navigation"
                      >
                        <Link href={siteConfig.routes.perfumes}>Perfumes</Link>
                        <Link href={siteConfig.routes.helpMeChoose}>Help Me Choose</Link>
                        <Link href={siteConfig.routes.cart}>Cart</Link>
                      </nav>
                    </div>
                    <div className="w-[210px]">
                      <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[.14em] text-[#a9a69d]">
                        Ordering
                      </p>
                      <div className="mt-3.5 grid text-[13px] leading-[30px]">
                        <Link href="#how-ordering-works">How ordering works</Link>
                        <span>Continue on WhatsApp</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-[#46463f] pt-[26px] text-[11px] leading-4 text-[#a9a69d]">
                  <span>© JPScents</span>
                  <span>Payment details are sent after your order is placed.</span>
                </div>
              </div>
            ) : (
              <div className="mx-auto hidden h-[102px] max-w-[1440px] items-center justify-between px-[72px] lg:flex">
                <Link
                  href={siteConfig.routes.home}
                  className="font-display text-[26px] font-semibold leading-8"
                >
                  JPScents
                </Link>
                <nav
                  aria-label="Footer navigation"
                  className="flex gap-1 text-xs uppercase leading-4 tracking-[.1em] text-[#d8d0c3]"
                >
                  <Link href={siteConfig.routes.perfumes}>Perfumes</Link>
                  <span aria-hidden="true">·</span>
                  <Link href={siteConfig.routes.helpMeChoose}>Help Me Choose</Link>
                  <span aria-hidden="true">·</span>
                  <Link href={siteConfig.routes.cart}>Cart</Link>
                </nav>
              </div>
            )}
          </footer>
        </div>
      </Dialog>
      <CartPreview />
    </CartProvider>
  );
}
