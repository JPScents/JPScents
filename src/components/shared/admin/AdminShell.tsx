"use client";

import Link from "next/link";
import { Menu, Store } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { signOutAdmin } from "@/components/shared/admin/actions";
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
import { cn } from "@/lib/utils";

const navigation = [
  { href: siteConfig.routes.admin, label: "Overview" },
  { href: siteConfig.routes.adminPerfumes, label: "Perfumes" },
  { href: siteConfig.routes.adminOrders, label: "Orders" },
  { href: siteConfig.routes.adminCustomers, label: "Customers" },
];

export function AdminShell({ children, email }: { children: ReactNode; email: string | null }) {
  const pathname = usePathname();
  const nav = (
    <nav className="grid gap-1" aria-label="Admin navigation">
      {navigation.map((item) => (
        <DialogClose key={item.href} asChild>
          <Link
            href={item.href}
            className={cn(
              "px-4 py-3 text-sm",
              pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground",
            )}
            aria-current={pathname === item.href ? "page" : undefined}
          >
            {item.label}
          </Link>
        </DialogClose>
      ))}
    </nav>
  );
  const accountControls = (
    <div className="border-t border-sidebar-border pt-5">
      <p className="text-sm">{email ?? "Store administrator"}</p>
      <p className="mt-1 text-xs text-sidebar-foreground/60">Signed in</p>
      <form action={signOutAdmin} className="mt-4">
        <button className="text-sm font-semibold underline" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );

  return (
    <Dialog>
      <div className="min-h-screen bg-jp-admin-canvas text-jp-text-primary">
        <aside className="hidden min-h-screen flex-col overflow-y-auto bg-jp-admin-sidebar px-5 py-7 text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:z-20 lg:flex lg:w-[15.5rem]">
          <div>
            <Link href={siteConfig.routes.admin} aria-label="JP Scents Admin overview">
              <BrandLogo className="w-24" tone="light" />
            </Link>
            <p className="mt-2 text-xs text-sidebar-foreground/70">Admin</p>
            <div className="mt-10">{nav}</div>
            <Link
              href={siteConfig.routes.home}
              className="mt-10 inline-flex items-center gap-2 px-4 py-3 text-sm"
            >
              <Store className="size-4" aria-hidden="true" />
              View store
            </Link>
          </div>
          <div className="mt-auto">{accountControls}</div>
        </aside>
        <div className="lg:pl-[15.5rem]">
          <header className="relative flex h-header-mobile items-center justify-between border-b bg-jp-admin-surface px-5 lg:h-20 lg:justify-end lg:px-admin-content">
            <DialogTrigger asChild>
              <button
                className="inline-flex size-11 items-center justify-center lg:hidden"
                type="button"
                aria-label="Open admin menu"
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
            </DialogTrigger>
            <Link
              href={siteConfig.routes.admin}
              aria-label="JP Scents Admin overview"
              className="absolute left-1/2 -translate-x-1/2 lg:hidden"
            >
              <BrandLogo className="w-10" />
            </Link>
            <span className="text-sm text-jp-text-secondary">{email ?? "Admin"}</span>
          </header>
          <DialogContent
            animation="from-left"
            className="inset-y-0 left-0 flex h-full w-[min(20rem,calc(100%-2.5rem))] max-w-none flex-col translate-x-0 translate-y-0 border-y-0 border-l-0 bg-jp-admin-sidebar text-sidebar-foreground lg:hidden"
          >
            <Link href={siteConfig.routes.admin} aria-label="JP Scents Admin overview">
              <BrandLogo className="w-16" tone="light" />
            </Link>
            <DialogTitle className="mt-2 font-sans text-xs font-normal text-sidebar-foreground/70">
              Admin
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose an Admin workspace page.
            </DialogDescription>
            <DialogCloseButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <div className="mt-10">{nav}</div>
            <div className="mt-auto">{accountControls}</div>
          </DialogContent>
          <MotionPage routeKey={pathname} className="p-5 lg:p-admin-content">
            {children}
          </MotionPage>
        </div>
      </div>
    </Dialog>
  );
}
