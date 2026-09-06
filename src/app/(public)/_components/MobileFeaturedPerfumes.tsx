import { ProductCard } from "@/components/shared/public/ProductCard";
import type { PublicPerfumeCard } from "@/features/catalogue";
export function MobileFeaturedPerfumes({ products }: { products: PublicPerfumeCard[] }) {
  return (
    <div className="lg:hidden grid gap-5">
      {products.slice(0, 3).map((perfume) => (
        <ProductCard key={perfume.id} perfume={perfume} />
      ))}
    </div>
  );
}
