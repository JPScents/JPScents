"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "../../public-catalogue";

export function GalleryProductCard({ perfume }: { perfume: PublicPerfumeCard }) {
  const reduceMotion = useReducedMotion();
  return (
    <Link
      href={siteConfig.routes.perfume(perfume.slug)}
      className="group block focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="flex flex-col gap-3.5"
      >
        <div className="relative aspect-[35/43] overflow-hidden bg-jp-stone lg:aspect-[392/570]">
          {perfume.primaryImageUrl ? (
            <Image
              src={perfume.primaryImageUrl}
              alt={perfume.primaryImageAlt}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, 33vw"
              className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <ProductBottlePlaceholder className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]" />
          )}
        </div>
        <div className="flex items-start justify-between gap-4 pt-0.5">
          <div>
            <h3 className="font-display text-[26px] font-semibold leading-[30px]">
              {perfume.name}
            </h3>
            <p className="mt-1 text-xs leading-[18px] text-jp-text-secondary">{perfume.scentCue}</p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold leading-[18px]">{perfume.startingPrice}</p>
            <p className="mt-1 text-[9px] font-semibold uppercase leading-[13px] tracking-[.12em] text-jp-olive">
              {perfume.isAvailable ? "Available" : "Unavailable"}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t pt-3 text-[11px] font-bold uppercase leading-4 tracking-[.06em]">
          <span>View Perfume</span>
          <span aria-hidden="true">→</span>
        </div>
      </motion.article>
    </Link>
  );
}
