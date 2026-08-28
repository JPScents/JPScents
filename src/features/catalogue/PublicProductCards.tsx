import Link from "next/link";
import Image from "next/image";

import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "./public-catalogue";

export function ProductBottlePlaceholder({ className = "" }: { className?: string }) {
  return <div className={`${className} grid h-full w-full place-items-center bg-[#eee7db]`} aria-label="Perfume bottle placeholder"><div className="relative h-3/5 w-1/3 rounded-b-[32%] border border-[#b9b09f] bg-[#f8f3e9]"><span className="absolute -top-5 left-1/2 h-5 w-1/2 -translate-x-1/2 border border-[#8d8579] bg-[#393933]" /><span className="absolute left-1/2 top-[42%] -translate-x-1/2 text-center font-display text-base text-[#5f5b53]">JP<br />Scents</span></div></div>;
}
function ProductImage({ perfume, className }: { perfume: PublicPerfumeCard; className: string }) {
  return perfume.primaryImageUrl ? <Image src={perfume.primaryImageUrl} alt={perfume.primaryImageAlt} fill unoptimized sizes="(max-width: 640px) 50vw, 33vw" className={className} /> : <ProductBottlePlaceholder className={className} />;
}

function CardMeta({ perfume }: { perfume: PublicPerfumeCard }) {
  return <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-3xl leading-none">{perfume.name}</h3><p className="mt-2 text-sm text-jp-text-secondary">{perfume.scentCue}</p></div><p className="shrink-0 text-sm font-medium">{perfume.startingPrice}</p></div>;
}

export function GalleryProductCard({ perfume }: { perfume: PublicPerfumeCard }) {
  return (
    <Link
      href={siteConfig.routes.perfume(perfume.slug)}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <article className="flex flex-col gap-3.5">
        <div className="relative aspect-[35/43] overflow-hidden bg-jp-stone lg:aspect-[392/570]">
          <ProductImage
            perfume={perfume}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </div>
        <div className="flex items-start justify-between gap-4 pt-0.5">
          <div>
            <h3 className="font-display text-[26px] font-semibold leading-[30px]">
              {perfume.name}
            </h3>
            <p className="mt-1 text-xs leading-[18px] text-jp-text-secondary">
              {perfume.scentCue}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold leading-[18px]">
              {perfume.startingPrice}
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase leading-[13px] tracking-[.12em] text-jp-olive">
              {perfume.isAvailable ? "Available" : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-[11px] font-bold uppercase leading-4 tracking-[.06em]">
          <span>View Perfume</span>
          <span aria-hidden="true">→</span>
        </div>
      </article>
    </Link>
  );
}

export function CatalogueProductCard({ perfume }: { perfume: PublicPerfumeCard }) {
  return <Link href={siteConfig.routes.perfume(perfume.slug)} className="block focus-visible:outline-2 focus-visible:outline-offset-4"><article className="border-b py-5 sm:border sm:bg-jp-surface sm:p-3"><div className="relative aspect-[1.1/1] overflow-hidden bg-jp-stone sm:aspect-[4/5]"><ProductImage perfume={perfume} className="h-full w-full object-cover" />{perfume.label && <span className="absolute left-2 top-2 bg-jp-surface px-2 py-1 text-[10px] uppercase tracking-[0.14em]">{perfume.label}</span>}</div><div className="px-1 pb-2 pt-5"><CardMeta perfume={perfume} />{!perfume.isAvailable && <p className="mt-3 text-xs font-medium text-jp-text-secondary">Currently unavailable</p>}</div></article></Link>;
}

export function RecommendationCard({ perfume, reason, leading = false }: { perfume: PublicPerfumeCard; reason: string; leading?: boolean }) {
  return <article className={`border-t py-4 ${leading ? "" : "grid grid-cols-[7rem_1fr] gap-4 lg:block"}`}><Link href={siteConfig.routes.perfume(perfume.slug)} className="block focus-visible:outline-2 focus-visible:outline-offset-4">{leading ? <div className="relative aspect-[4/3] bg-jp-stone"><ProductImage perfume={perfume} className="object-contain" />{perfume.label && <span className="absolute left-3 top-3 bg-[#2e352a] px-2 py-1 text-[10px] uppercase tracking-[.12em] text-white">Strongest match</span>}</div> : <div className="relative aspect-[7/8] bg-jp-stone lg:aspect-[4/3]"><ProductImage perfume={perfume} className="object-contain" /></div>}</Link><div className={leading ? "mt-3 flex items-start justify-between gap-3" : "lg:mt-3 lg:flex lg:items-start lg:justify-between lg:gap-3"}><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-jp-olive">{leading ? "Strongest match" : "Close match"}</p><h3 className="mt-1 font-display text-3xl">{perfume.name}</h3><p className="mt-1 text-sm text-jp-text-secondary">{reason}</p></div><p className="shrink-0 text-sm font-semibold">{perfume.startingPrice}</p></div><Link href={siteConfig.routes.perfume(perfume.slug)} className={`${leading ? "bg-jp-text-primary text-jp-surface" : "border"} mt-4 block px-4 py-3 text-center text-sm`}>View perfume</Link></article>;
}
