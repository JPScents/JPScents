import Link from "next/link";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { siteConfig } from "@/config/site";

export function Footer() {
  return (
    <footer className="bg-[#1f211d] text-white">
      <div className="mx-auto flex h-44 max-w-[1440px] flex-col justify-between px-5 py-7 lg:hidden">
        <Link href={siteConfig.routes.home} aria-label="JP Scents home" className="w-fit">
          <BrandLogo className="w-12" tone="light" />
        </Link>
        <div className="space-y-[9px] text-xs font-medium uppercase tracking-[.08em]">
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-1 text-white/80">
            <Link href={siteConfig.routes.perfumes}>Perfumes</Link>
            <span aria-hidden="true">·</span>
            <Link href={siteConfig.routes.helpMeChoose}>Help Me Choose</Link>
            <span aria-hidden="true">·</span>
            <Link href={siteConfig.routes.cart}>Cart</Link>
          </nav>
          <p className="text-[11px] text-white/65">Perfume, chosen with care.</p>
        </div>
      </div>
      <div className="mx-auto hidden h-[500px] max-w-[1440px] flex-col justify-between px-[104px] pb-9 pt-[76px] lg:flex">
        <div className="flex items-start justify-between">
          <div className="w-[420px]">
            <Link href={siteConfig.routes.home} aria-label="JP Scents home" className="inline-flex">
              <BrandLogo className="w-24" tone="light" />
            </Link>
            <p className="mt-4 text-[13px] leading-[22px] text-white/75">
              Curated perfumes, clear choices, and a simple way to place your order.
            </p>
          </div>
          <div className="flex gap-[110px]">
            <div className="w-[150px]">
              <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[.14em] text-white/65">
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
              <p className="text-[10px] font-semibold uppercase leading-[14px] tracking-[.14em] text-white/65">
                Ordering
              </p>
              <div className="mt-3.5 grid text-[13px] leading-[30px]">
                <Link href={`${siteConfig.routes.home}#how-ordering-works`}>
                  How ordering works
                </Link>
                <span>Continue on WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/25 pt-[26px] text-[11px] leading-4 text-white/65">
          <span>© JPScents</span>
          <span>Payment details are sent after your order is placed.</span>
        </div>
      </div>
    </footer>
  );
}
