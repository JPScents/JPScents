import Image from "next/image";
import Link from "next/link";

import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { siteConfig } from "@/config/site";
import type { PublicPerfumeCard } from "../../types";

export function RecommendationCard({
  perfume,
  reason,
  leading = false,
}: {
  perfume: PublicPerfumeCard;
  reason: string;
  leading?: boolean;
}) {
  const image = perfume.primaryImageUrl ? (
    <Image
      src={perfume.primaryImageUrl}
      alt={perfume.primaryImageAlt}
      fill
      unoptimized
      sizes="(max-width: 640px) 50vw, 33vw"
      className="object-contain"
    />
  ) : (
    <ProductBottlePlaceholder className="object-contain" />
  );
  return (
    <article
      className={`border-t py-4 ${leading ? "" : "grid grid-cols-[7rem_1fr] gap-4 lg:block"}`}
    >
      <Link
        href={siteConfig.routes.perfume(perfume.slug)}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        {leading ? (
          <div className="relative aspect-[4/3] bg-jp-stone">
            {image}
            {perfume.label && (
              <span className="absolute left-3 top-3 bg-[#2e352a] px-2 py-1 text-[10px] uppercase tracking-[.12em] text-white">
                Strongest match
              </span>
            )}
          </div>
        ) : (
          <div className="relative aspect-[7/8] bg-jp-stone lg:aspect-[4/3]">{image}</div>
        )}
      </Link>
      <div
        className={
          leading
            ? "mt-3 flex items-start justify-between gap-3"
            : "lg:mt-3 lg:flex lg:items-start lg:justify-between lg:gap-3"
        }
      >
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-jp-olive">
            {leading ? "Strongest match" : "Close match"}
          </p>
          <h3 className="mt-1 font-display text-3xl">{perfume.name}</h3>
          <p className="mt-1 text-sm text-jp-text-secondary">{reason}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold">{perfume.startingPrice}</p>
      </div>
      <Link
        href={siteConfig.routes.perfume(perfume.slug)}
        className={`${leading ? "bg-jp-text-primary text-jp-surface" : "border"} mt-4 block px-4 py-3 text-center text-sm`}
      >
        View perfume
      </Link>
    </article>
  );
}
