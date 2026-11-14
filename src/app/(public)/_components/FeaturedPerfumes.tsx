import Link from "next/link";
import { MotionReveal } from "@/ui/MotionReveal";
import { ProductCard } from "./ProductCard";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "@/modules/catalogue";

export function FeaturedPerfumes({ products }: { products: PublicPerfumeCard[] }) {
  if (!products.length) {
    return null;
  }
  return (
    <MotionReveal>
      <section className="border-y bg-[#fbf9f4] px-5 py-[54px] lg:bg-[#f7f3ea] lg:px-[104px] lg:py-[92px]">
        <div className="mx-auto max-w-[1232px]">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-jp-olive">
                Available perfumes
              </p>
              <h2 className="mt-3 font-display text-[38px] lg:text-[54px]">A considered edit.</h2>
            </div>
            <Link href={siteConfig.routes.perfumes} className="border-b pb-2 text-xs font-semibold">
              View all perfumes →
            </Link>
          </div>
          <div className="mt-6 lg:mt-12">
            <div className="grid gap-5 lg:grid-cols-3 lg:gap-7">
              {products.map((perfume) => (
                <ProductCard key={perfume.id} perfume={perfume} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </MotionReveal>
  );
}
