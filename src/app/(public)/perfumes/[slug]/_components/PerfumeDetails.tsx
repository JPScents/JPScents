import Image from "next/image";
import Link from "next/link";

import { MotionReveal } from "@/components/shared/MotionReveal";
import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeDetail } from "@/features/catalogue/shared";

import { ProductDetailsAccordion } from "./ProductDetailsAccordion";
import { VariantPurchaseControls } from "./VariantPurchaseControls";

export function PerfumeDetails({ perfume }: { perfume: PublicPerfumeDetail }) {
  const availability = perfume.isAvailable ? "Available to order" : "Currently unavailable";

  return (
    <>
      <MotionReveal priority>
        <div className="mx-auto max-w-public-container px-public-gutter-mobile pt-5 text-sm text-jp-text-secondary lg:px-public-gutter-desktop">
          <Link href={siteConfig.routes.perfumes} className="underline">
            Perfumes
          </Link>{" "}
          <span aria-hidden="true">/</span> <span>{perfume.name}</span>
        </div>
      </MotionReveal>
      <MotionReveal priority>
        <section className="mx-auto grid max-w-public-container gap-8 px-public-gutter-mobile py-8 lg:grid-cols-2 lg:px-public-gutter-desktop lg:py-14">
          <div className="relative aspect-[4/5] overflow-hidden bg-jp-stone">
            {perfume.primaryImageUrl ? (
              <Image
                src={perfume.primaryImageUrl}
                alt={perfume.primaryImageAlt}
                fill
                loading="eager"
                unoptimized
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain"
              />
            ) : (
              <ProductBottlePlaceholder className="absolute inset-0" />
            )}
          </div>
          <div className="lg:py-8">
            {perfume.label ? (
              <p className="text-sm uppercase tracking-[.18em] text-jp-olive">
                {perfume.label} perfume
              </p>
            ) : null}
            <div className="mt-3 flex items-end justify-between gap-4">
              <h1 className="font-display text-[44px] leading-[46px] lg:text-[72px] lg:leading-[76px]">
                {perfume.name}
              </h1>
              <p className="shrink-0 text-lg font-medium">{perfume.startingPrice}</p>
            </div>
            <p className="mt-4 text-sm font-medium">{availability}</p>
            <p className="mt-5 text-xl text-jp-text-secondary">{perfume.scentCue}</p>
            <p className="mt-6 leading-7 text-jp-text-secondary">{perfume.description}</p>
            <VariantPurchaseControls variants={perfume.variants} />
            <ProductDetailsAccordion perfume={perfume} />
          </div>
        </section>
      </MotionReveal>
    </>
  );
}
