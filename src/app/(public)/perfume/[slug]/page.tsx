import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { siteConfig } from "@/config/site";
import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import {
  GalleryProductCard,
  getPerfumeBySlug,
  getRelatedPerfumes,
  preferenceLabel,
  type PublicPerfumeDetail,
} from "@/features/catalogue";
import { VariantPurchaseControls } from "./VariantPurchaseControls";

export const dynamic = "force-dynamic";

function ProfileRows({ perfume }: { perfume: PublicPerfumeDetail }) {
  const rows = [
    {
      label: "Character",
      value: perfume.scentCharacters.map(preferenceLabel).join(" · "),
    },
    {
      label: "Occasion",
      value: perfume.occasions.map(preferenceLabel).join(" · "),
    },
    {
      label: "Day / Night",
      value: perfume.timesOfDay.map(preferenceLabel).join(" · "),
    },
  ];

  return (
    <dl>
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`grid min-h-[52px] grid-cols-[210px_1fr] items-center border-t ${index === rows.length - 1 ? "border-b" : ""}`}
        >
          <dt className="text-[13px] leading-4 text-jp-text-secondary">{row.label}</dt>
          <dd className="text-[15px] leading-[18px]">{row.value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

function DesktopProfile({ perfume }: { perfume: PublicPerfumeDetail }) {
  const characters = perfume.scentCharacters.map(preferenceLabel);
  const heading = characters.length
    ? `A ${characters.map((value) => value.toLowerCase()).join(", ")} profile.`
    : "A considered scent profile.";

  return (
    <section className="hidden bg-jp-surface px-[72px] pt-12 lg:block">
      <div className="mx-auto grid max-w-[1296px] grid-cols-[560px_620px] gap-[90px] border-t pt-[38px]">
        <div>
          <p className="text-xs font-semibold uppercase leading-4 tracking-[.16em] text-jp-olive">
            Perfume character
          </p>
          <h2 className="mt-3.5 font-display text-[42px] leading-[46px]">{heading}</h2>
          <p className="mt-[15px] text-[15px] leading-[25px] text-jp-text-secondary">
            {perfume.scentCue}
          </p>
        </div>
        <div>
          <p className="pb-4 text-xs font-semibold uppercase leading-4 tracking-[.16em] text-jp-olive">
            Scent profile
          </p>
          <ProfileRows perfume={perfume} />
        </div>
      </div>
    </section>
  );
}

function DisclosureIcon() {
  return (
    <>
      <span className="text-lg leading-[22px] group-open:hidden" aria-hidden="true">
        +
      </span>
      <span className="hidden text-lg leading-[22px] group-open:inline" aria-hidden="true">
        −
      </span>
    </>
  );
}

function MobileDetailAccordions({ perfume }: { perfume: PublicPerfumeDetail }) {
  const characters = perfume.scentCharacters.map(preferenceLabel).join(" · ");
  const occasions = perfume.occasions.map(preferenceLabel).join(" · ");
  const times = perfume.timesOfDay.map(preferenceLabel).join(" · ");

  return (
    <div className="mt-8 border-t lg:hidden">
      <details className="group border-b">
        <summary className="flex min-h-[74px] cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[13px] font-semibold leading-5">Scent profile</span>
            <span className="block text-xs leading-[18px] text-jp-text-secondary">
              {characters || "Perfume character"}
            </span>
          </span>
          <DisclosureIcon />
        </summary>
        <dl className="space-y-3 pb-5 text-[13px] leading-5">
          <div>
            <dt className="text-jp-text-secondary">Character</dt>
            <dd>{characters || "—"}</dd>
          </div>
          <div>
            <dt className="text-jp-text-secondary">Occasion</dt>
            <dd>{occasions || "—"}</dd>
          </div>
          <div>
            <dt className="text-jp-text-secondary">Day / Night</dt>
            <dd>{times || "—"}</dd>
          </div>
        </dl>
      </details>
      <details className="group border-b">
        <summary className="flex min-h-[74px] cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[13px] font-semibold leading-5">Delivery</span>
            <span className="block text-xs leading-[18px] text-jp-text-secondary">
              Timing and cost confirmed for your order
            </span>
          </span>
          <DisclosureIcon />
        </summary>
        <p className="pb-5 text-[13px] leading-5 text-jp-text-secondary">
          Delivery timing and cost are confirmed after you place the order.
        </p>
      </details>
      <details className="group border-b">
        <summary className="flex min-h-[74px] cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="block text-[13px] font-semibold leading-5">Payment</span>
            <span className="block text-xs leading-[18px] text-jp-text-secondary">
              Details are sent after you place the order
            </span>
          </span>
          <DisclosureIcon />
        </summary>
        <p className="pb-5 text-[13px] leading-5 text-jp-text-secondary">
          No payment is taken online. Continue on WhatsApp after checkout to receive the payment
          details.
        </p>
      </details>
    </div>
  );
}

export default async function PerfumeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const perfume = await getPerfumeBySlug(slug);
  if (!perfume) notFound();

  const related = await getRelatedPerfumes(perfume, 3);
  const availability = perfume.isAvailable ? "Available to order" : "Currently unavailable";

  return (
    <>
      <div className="mx-auto max-w-public-container px-public-gutter-mobile pt-5 text-sm text-jp-text-secondary lg:px-public-gutter-desktop">
        <Link href={siteConfig.routes.perfumes} className="underline">
          Perfumes
        </Link>{" "}
        <span aria-hidden="true">/</span> <span>{perfume.name}</span>
      </div>
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
          <MobileDetailAccordions perfume={perfume} />
        </div>
      </section>
      <DesktopProfile perfume={perfume} />
      {related.length > 0 ? (
        <section className="bg-jp-surface px-5 py-16 lg:px-[72px] lg:pb-[96px] lg:pt-[92px]">
          <div className="mx-auto max-w-[1296px]">
            <p className="text-[11px] font-semibold uppercase leading-[14px] tracking-[.16em] text-jp-olive">
              You may also like
            </p>
            <h2 className="mt-2 font-display text-[44px] leading-[46px] lg:text-[42px]">
              More available perfumes
            </h2>
            <div className="mt-8 grid gap-[68px] lg:grid-cols-3 lg:gap-14">
              {related.map((item) => (
                <GalleryProductCard key={item.id} perfume={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
