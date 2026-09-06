import Image from "next/image";
import Link from "next/link";
import { EmptyState } from "@/components/shared/EmptyState";
import { MotionReveal } from "@/components/shared/MotionReveal";
import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "@/features/catalogue/shared";

function HeroImage({ perfume }: { perfume: PublicPerfumeCard }) {
  return perfume.primaryImageUrl ? (
    <Image
      src={perfume.primaryImageUrl}
      alt={perfume.primaryImageAlt}
      fill
      priority
      unoptimized
      sizes="(max-width: 1024px) 350px, 558px"
      className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
    />
  ) : (
    <ProductBottlePlaceholder className="h-full w-full object-contain" />
  );
}
export function Hero({ hero }: { hero?: PublicPerfumeCard }) {
  return (
    <MotionReveal priority>
      <section className="bg-[#f7f3ea] px-5 pb-12 pt-11 lg:min-h-[836px] lg:bg-jp-surface lg:px-[104px] lg:pb-[70px] lg:pt-[50px]">
        <div className="mx-auto flex max-w-[1232px] flex-col gap-7 lg:min-h-[716px] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-4 lg:w-[560px] lg:gap-6">
            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-jp-olive">
              Featured perfume
            </p>
            <h1 className="font-display text-5xl font-medium leading-[48px] lg:text-[72px] lg:leading-[70px]">
              Find a fragrance that feels right for you.
            </h1>
            <p className="text-[15px] leading-6 text-jp-text-secondary">
              {hero
                ? `Discover ${hero.name}, ${hero.scentCue.toLowerCase()}, or browse the collection to find something that suits you.`
                : "The first JPScents collection is being prepared for you."}
            </p>
            {hero ? (
              <div className="hidden gap-3 lg:flex">
                <Link
                  href={siteConfig.routes.perfume(hero.slug)}
                  className="btn-primary h-[52px] px-6"
                >
                  View {hero.name}
                </Link>
                <Link href={siteConfig.routes.perfumes} className="btn-secondary h-[52px] px-6">
                  Browse Perfumes
                </Link>
              </div>
            ) : null}
          </div>
          {hero ? (
            <Link href={siteConfig.routes.perfume(hero.slug)} className="group lg:w-[558px]">
              <div className="relative h-[420px] overflow-hidden bg-jp-stone lg:h-[650px]">
                <HeroImage perfume={hero} />
              </div>
            </Link>
          ) : (
            <EmptyState
              eyebrow="Catalogue in preparation"
              title="The first collection is taking shape."
              description="JPScents has not published any perfumes for ordering yet. Please check back when the collection is ready."
            />
          )}
        </div>
      </section>
    </MotionReveal>
  );
}
