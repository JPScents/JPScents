import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import {
  CatalogueProductCard,
  hasPublishedPerfumes,
  listPerfumes,
  parseScent,
  publicScentCharacters,
  scentCharacterContent,
} from "@/features/catalogue";
import { siteConfig } from "@/config/site";

export const dynamic = "force-dynamic";

export default async function PerfumesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scent = parseScent(params.scent);
  const perfumes = await listPerfumes({ scentCharacter: scent });
  const catalogueEmpty = perfumes.length === 0 && (!scent || !(await hasPublishedPerfumes()));
  return (
    <>
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-20">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-16">
          <div>
            <p className="text-sm uppercase tracking-[.18em] text-jp-text-secondary">Perfumes</p>
            <h1 className="mt-3 font-display text-6xl lg:text-8xl">
              <span className="lg:hidden">Find your perfume.</span>
              <span className="hidden lg:inline">Available perfumes</span>
            </h1>
          </div>
          <p className="mt-5 max-w-md text-jp-text-secondary lg:mt-0">
            Browse what is currently available. Each perfume shows its scent character and starting
            price.
          </p>
        </div>
        <div className="mt-10 border-y py-5 lg:flex lg:items-center lg:justify-between">
          <nav
            className="flex gap-2 overflow-x-auto pb-1 lg:flex-wrap lg:overflow-visible"
            aria-label="Filter perfumes by scent character"
          >
            <Link
              href={siteConfig.routes.perfumes}
              className={`shrink-0 border px-4 py-2 text-sm ${!scent ? "bg-jp-text-primary text-jp-surface" : "bg-jp-surface"}`}
            >
              All
            </Link>
            {publicScentCharacters.map((value) => (
              <Link
                key={value}
                href={`${siteConfig.routes.perfumes}?scent=${value}`}
                aria-current={scent === value ? "page" : undefined}
                className={`shrink-0 border px-4 py-2 text-sm ${scent === value ? "bg-jp-text-primary text-jp-surface" : "bg-jp-surface"}`}
              >
                {scentCharacterContent[value].label}
              </Link>
            ))}
          </nav>
          <p className="mt-4 text-sm text-jp-text-secondary lg:mt-0" aria-live="polite">
            {perfumes.length} {perfumes.length === 1 ? "available perfume" : "available perfumes"}
            {scent ? ` in ${scentCharacterContent[scent].label}` : ""}
          </p>
        </div>
        {perfumes.length ? (
          <div className="mt-6 grid gap-x-5 sm:grid-cols-2 lg:grid-cols-3">
            {perfumes.map((perfume) => (
              <CatalogueProductCard key={perfume.id} perfume={perfume} />
            ))}
          </div>
        ) : catalogueEmpty ? (
          <EmptyState
            className="mt-10"
            eyebrow="Catalogue in preparation"
            title="The first collection is being prepared."
            description="JPScents has not published any perfumes for ordering yet. The collection will appear here once product details and availability are ready."
          />
        ) : (
          <EmptyState
            className="mt-10"
            eyebrow="No perfumes found"
            title="Try one preference at a time."
            description="Clear your current choice to see every available perfume, or let us narrow the options with you."
          >
            <Link
              href={siteConfig.routes.perfumes}
              className="bg-jp-text-primary px-5 py-3 text-sm font-semibold text-jp-surface"
            >
              Clear filters
            </Link>
            <Link
              href={siteConfig.routes.helpMeChoose}
              className="border border-jp-text-primary px-5 py-3 text-sm font-semibold"
            >
              Find my scent
            </Link>
          </EmptyState>
        )}
      </section>
      <section className="border-t bg-jp-stone">
        <div className="mx-auto grid max-w-public-container gap-5 px-public-gutter-mobile py-12 sm:grid-cols-3 lg:px-public-gutter-desktop">
          <div>
            <h2 className="font-display text-3xl">Before you choose</h2>
            <p className="mt-2 text-sm text-jp-text-secondary">
              Take your time with the collection.
            </p>
          </div>
          <p className="text-sm text-jp-text-secondary">
            Every perfume is described with its scent character and availability.
          </p>
          <p className="text-sm text-jp-text-secondary">
            Need a starting point? Our guide keeps the choice simple.
          </p>
        </div>
      </section>
    </>
  );
}
