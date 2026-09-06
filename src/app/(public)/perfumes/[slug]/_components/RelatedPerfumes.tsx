import { MotionReveal } from "@/components/shared/MotionReveal";
import { ProductCard } from "@/components/shared/public/ProductCard";
import type { PublicPerfumeCard } from "@/features/catalogue";

export function RelatedPerfumes({ perfumes }: { perfumes: PublicPerfumeCard[] }) {
  if (!perfumes.length) return null;

  return (
    <MotionReveal>
      <section className="bg-jp-surface px-5 py-16 lg:px-[72px] lg:pb-[96px] lg:pt-[92px]">
        <div className="mx-auto max-w-[1296px]">
          <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-[.16em] text-jp-olive">
            You may also like
          </p>
          <h2 className="mt-2 font-display text-[44px] leading-[46px] lg:text-[42px]">
            More available perfumes
          </h2>
          <div className="mt-8 grid gap-[68px] lg:grid-cols-3 lg:gap-14">
            {perfumes.map((perfume, index) => (
              <MotionReveal key={perfume.id} delay={Math.min(index, 2) * 0.04}>
                <ProductCard perfume={perfume} />
              </MotionReveal>
            ))}
          </div>
        </div>
      </section>
    </MotionReveal>
  );
}
