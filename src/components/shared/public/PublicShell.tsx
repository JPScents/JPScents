"use client";

import Link from "next/link";
import { Menu, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Dialog, DialogClose, DialogCloseButton, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const navigation = [
  { href: siteConfig.routes.perfumes, label: "Perfumes" },
  { href: siteConfig.routes.helpMeChoose, label: "Help me choose" },
];

export function PublicShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <Dialog>
    <div className="min-h-screen bg-jp-canvas text-jp-text-primary">
      <header className="border-b bg-jp-surface">
        <div className="mx-auto flex h-header-mobile max-w-public-container items-center justify-between px-public-gutter-mobile lg:h-header-desktop lg:px-public-gutter-desktop">
          <Link href={siteConfig.routes.home} className="font-display text-3xl tracking-wide">JPScents</Link>
          <nav className="hidden items-center gap-8 lg:flex" aria-label="Primary navigation">
            {navigation.map((item) => <Link key={item.href} href={item.href} className={cn("text-sm", pathname === item.href && "border-b border-jp-text-primary pb-1")} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-3"><DialogTrigger asChild><button className="inline-flex h-11 items-center gap-2 lg:hidden" type="button" aria-label="Open menu"><span className="text-sm font-semibold">Menu</span><Menu className="size-5" aria-hidden="true" /></button></DialogTrigger><Link href={siteConfig.routes.cart} className="inline-flex items-center gap-2" aria-label="Open cart, 0 items"><ShoppingBag className="size-5" aria-hidden="true" /><span className="grid size-6 place-items-center rounded-full border border-[#beb7aa] text-[11px] font-semibold">0</span></Link></div>
        </div>
      </header>
      <DialogContent className="inset-x-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 border-x-0 border-b-0 rounded-t-sheet lg:hidden">
        <DialogTitle>Navigation</DialogTitle>
        <DialogDescription className="sr-only">Browse JPScents pages.</DialogDescription>
        <DialogCloseButton />
        <nav className="mt-10 grid gap-6 text-2xl" aria-label="Mobile primary navigation">{navigation.map((item) => <DialogClose key={item.href} asChild><Link href={item.href}>{item.label}</Link></DialogClose>)}</nav>
      </DialogContent>
      <main>{children}</main>
      <footer className="bg-[#1f211d] text-white"><div className="mx-auto flex max-w-public-container flex-col justify-between gap-10 px-public-gutter-mobile py-10 lg:flex-row lg:items-end lg:px-public-gutter-desktop lg:py-14"><Link href={siteConfig.routes.home} className="font-display text-4xl">JPScents</Link><div className="space-y-3 text-xs font-medium uppercase tracking-[.08em]"><nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-[#d9ddd3]"><Link href={siteConfig.routes.perfumes}>Perfumes</Link><Link href={siteConfig.routes.helpMeChoose}>Help Me Choose</Link><Link href={siteConfig.routes.cart}>Cart</Link></nav><p className="text-[#9ea399]">Perfume, chosen with care.</p></div></div></footer>
    </div>
    </Dialog>
  );
}
