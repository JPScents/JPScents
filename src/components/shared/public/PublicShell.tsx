"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { MotionPage } from "@/components/shared/MotionPage";
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

import { Footer } from "./Footer";

const navigation = [
  { href: siteConfig.routes.perfumes, label: "Perfumes" },
  { href: siteConfig.routes.helpMeChoose, label: "Help me choose" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <CartProvider>
      <Dialog>
        <div className="min-h-screen bg-jp-canvas text-jp-text-primary">
          <header className="border-b bg-jp-surface">
            <div className="relative mx-auto flex h-[72px] max-w-[1440px] items-center justify-between px-5 lg:h-[104px] lg:px-[104px]">
              <Link
                href={siteConfig.routes.home}
                aria-label="JP Scents home"
                className="inline-flex items-center"
              >
                <BrandLogo className="w-11 lg:w-16" />
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
                      "text-[13px] font-medium",
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
            <Link href={siteConfig.routes.home} aria-label="JP Scents home" className="w-fit">
              <BrandLogo className="w-16" />
            </Link>
            <DialogTitle className="sr-only">Navigation</DialogTitle>
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
          <MotionPage routeKey={pathname}>{children}</MotionPage>
          <Footer />
        </div>
      </Dialog>
      <CartPreview />
    </CartProvider>
  );
}
