"use client";

import Link from "next/link";
import { Menu, Store } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Dialog, DialogClose, DialogCloseButton, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

const navigation = [
  { href: siteConfig.routes.admin, label: "Overview" },
  { href: siteConfig.routes.adminPerfumes, label: "Perfumes" },
  { href: siteConfig.routes.adminOrders, label: "Orders" },
];

export function AdminShell({ children, email }: { children: ReactNode; email: string | null }) {
  const pathname = usePathname();
  const nav = <nav className="grid gap-1" aria-label="Admin navigation">{navigation.map((item) => <DialogClose key={item.href} asChild><Link href={item.href} className={cn("px-4 py-3 text-sm", pathname === item.href && "bg-sidebar-accent text-sidebar-accent-foreground")} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link></DialogClose>)}</nav>;

  return <Dialog><div className="min-h-screen bg-jp-admin-canvas text-jp-text-primary lg:grid lg:grid-cols-[15.5rem_1fr]">
    <aside className="hidden min-h-screen bg-jp-admin-sidebar px-5 py-7 text-sidebar-foreground lg:block"><Link href={siteConfig.routes.admin} className="font-display text-3xl">JPScents</Link><p className="mt-2 text-xs text-sidebar-foreground/70">Admin</p><div className="mt-10">{nav}</div><Link href={siteConfig.routes.home} className="mt-10 inline-flex items-center gap-2 px-4 py-3 text-sm"><Store className="size-4" aria-hidden="true" />View store</Link></aside>
    <div><header className="flex h-header-mobile items-center justify-between border-b bg-jp-admin-surface px-5 lg:h-20 lg:justify-end lg:px-admin-content"><DialogTrigger asChild><button className="inline-flex size-11 items-center justify-center lg:hidden" type="button" aria-label="Open admin menu"><Menu className="size-5" aria-hidden="true" /></button></DialogTrigger><span className="text-sm text-jp-text-secondary">{email ?? "Admin"}</span></header><DialogContent className="inset-y-0 left-0 h-full w-[min(20rem,calc(100%-2.5rem))] max-w-none translate-x-0 translate-y-0 border-y-0 border-l-0 bg-jp-admin-sidebar text-sidebar-foreground lg:hidden"><DialogTitle className="text-sidebar-foreground">Admin navigation</DialogTitle><DialogDescription className="sr-only">Choose an Admin workspace page.</DialogDescription><DialogCloseButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" /><div className="mt-10">{nav}</div></DialogContent><main className="p-5 lg:p-admin-content">{children}</main></div>
  </div></Dialog>;
}
