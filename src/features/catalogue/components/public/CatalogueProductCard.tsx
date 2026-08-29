"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";

import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "../../public-catalogue";

export function CatalogueProductCard({ perfume }: { perfume: PublicPerfumeCard }) {
  const reduceMotion = useReducedMotion();
  return (
    <Link
      href={siteConfig.routes.perfume(perfume.slug)}
      className="block focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <motion.article
        whileHover={reduceMotion ? undefined : { y: -2 }}
        whileTap={reduceMotion ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="border-b py-5 sm:border sm:bg-jp-surface sm:p-3"
      >
        <div className="relative aspect-[1.1/1] overflow-hidden bg-jp-stone sm:aspect-[4/5]">
          {perfume.primaryImageUrl ? (
            <Image
              src={perfume.primaryImageUrl}
              alt={perfume.primaryImageAlt}
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          ) : (
            <ProductBottlePlaceholder className="h-full w-full object-cover" />
          )}
          {perfume.label && (
            <span className="absolute left-2 top-2 bg-jp-surface px-2 py-1 text-[10px] uppercase tracking-[0.14em]">
              {perfume.label}
            </span>
          )}
        </div>
        <div className="px-1 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-3xl leading-none">{perfume.name}</h3>
              <p className="mt-2 text-sm text-jp-text-secondary">{perfume.scentCue}</p>
            </div>
            <p className="shrink-0 text-sm font-medium">{perfume.startingPrice}</p>
          </div>
          {!perfume.isAvailable && (
            <p className="mt-3 text-xs font-medium text-jp-text-secondary">Currently unavailable</p>
          )}
        </div>
      </motion.article>
    </Link>
  );
}
