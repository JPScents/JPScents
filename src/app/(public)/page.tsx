import Image from "next/image";
import Link from "next/link";
import { CircleHelp } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { siteConfig } from "@/config/site";
import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import {
  GalleryProductCard,
  getFeaturedPerfumes,
  publicScentCharacters,
  ScentCharacterBrowse,
  type PublicPerfumeCard,
} from "@/features/catalogue";

export const dynamic = "force-dynamic";

const primaryButton =
  "inline-flex h-[52px] items-center justify-center bg-jp-text-primary px-6 text-sm font-semibold text-jp-surface lg:text-xs lg:font-bold lg:uppercase lg:tracking-[.08em]";
const secondaryButton =
  "inline-flex h-[52px] items-center justify-center border border-jp-text-primary px-6 text-sm font-semibold lg:text-xs lg:font-bold lg:uppercase lg:tracking-[.08em]";

const orderingSteps = [
  { number: "01", desktop: "Choose your perfume and size", mobile: "Choose a perfume and size" },
  {
    number: "02",
    desktop: "Add one or more perfumes to Cart",
    mobile: "Add it to your cart and continue browsing",
  },
  { number: "03", desktop: "Checkout and Place Order", mobile: "Review your cart and checkout" },
  {
    number: "04",
    desktop: "Receive your JPScents Order Reference",
    mobile: "Place your order to receive a reference",
  },
  {
    number: "05",
    desktop: "Continue on WhatsApp with your reference",
    mobile: "Continue on WhatsApp",
  },
  {
    number: "06",
    desktop: "Receive payment details and confirm delivery",
    mobile: "Confirm payment and delivery arrangements",
  },
] as const;

const desktopFaqs = [
  {
    question: "Is this perfume available in my preferred size?",
    answer:
      "Each perfume page shows availability by size. An unavailable size cannot be added to your cart.",
  },
  {
    question: "When will I receive payment details?",
    answer:
      "Payment details are shared after your order is saved and you continue with your order reference on WhatsApp.",
  },
  {
    question: "How is delivery arranged?",
    answer: "Delivery timing and cost are confirmed with you after the order is placed.",
  },
  {
    question: "How long does the fragrance last?",
    answer:
      "Longevity varies by perfume, application, and skin. Ask JPScents about a specific perfume before ordering if this is important to you.",
  },
] as const;

const mobileFaqs = [
  {
    question: "Is this perfume available?",
    answer: "Availability is shown for every perfume and size before you add it to your cart.",
  },
  {
    question: "How long does delivery take?",
    answer: "Delivery timing and cost are confirmed with you after the order is placed.",
  },
  {
    question: "How do I place my order?",
    answer:
      "Add your perfume and size to the cart, complete checkout, then continue on WhatsApp with your order reference.",
  },
  {
    question: "How long does the perfume last?",
    answer:
      "Longevity varies by perfume, application, and skin. JPScents can help with a specific perfume before you order.",
  },
] as const;

function ProductImage({
  perfume,
  className,
  priority = false,
}: {
  perfume: PublicPerfumeCard;
  className?: string;
  priority?: boolean;
}) {
  if (!perfume.primaryImageUrl) return <ProductBottlePlaceholder className={className} />;
  return (
    <Image
      src={perfume.primaryImageUrl}
      alt={perfume.primaryImageAlt}
      fill
      loading={priority ? "eager" : "lazy"}
      unoptimized
      sizes="(max-width: 1024px) 350px, 558px"
      className={`object-contain ${className ?? ""}`}
    />
  );
}

function HomepageHero({ hero }: { hero?: PublicPerfumeCard }) {
  return (
    <section className="bg-[#f7f3ea] px-5 pb-12 pt-11 lg:min-h-[836px] lg:bg-jp-surface lg:px-[104px] lg:pb-[70px] lg:pt-[50px]">
      <div className="mx-auto flex max-w-[1232px] flex-col gap-7 lg:min-h-[716px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-4 lg:w-[560px] lg:gap-6">
          <p className="text-[11px] font-semibold uppercase leading-4 tracking-[.18em] text-jp-olive">
            Featured perfume
          </p>
          <h1 className="font-display text-5xl font-medium leading-[48px] tracking-[-.02em] lg:text-[72px] lg:leading-[70px] lg:tracking-[-.035em]">
            Find a fragrance that feels right for you.
          </h1>
          <p className="text-[15px] leading-6 text-jp-text-secondary lg:w-[500px] lg:text-[17px] lg:leading-[29px]">
            <span className="lg:hidden">
              Explore available perfumes, choose your size, and place your order before continuing
              on WhatsApp.
            </span>
            <span className="hidden lg:inline">
              {hero
                ? `Discover ${hero.name}, ${hero.scentCue.toLowerCase()}, or browse the collection to find something that suits you.`
                : "The first JPScents collection is being prepared for you."}
            </span>
          </p>
          {hero ? (
            <>
              <div className="hidden w-[500px] items-end justify-between border-t pt-2 lg:flex">
                <div>
                  <h2 className="font-display text-[28px] font-semibold leading-8">{hero.name}</h2>
                  <p className="mt-1 text-[13px] leading-5 text-jp-text-secondary">
                    {hero.scentCue}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-semibold leading-[18px]">{hero.startingPrice}</p>
                  <p className="mt-1 text-[10px] font-semibold uppercase leading-[14px] tracking-[.12em] text-jp-olive">
                    Available
                  </p>
                </div>
              </div>
              <div className="hidden gap-3 pt-2 lg:flex">
                <Link href={siteConfig.routes.perfume(hero.slug)} className={primaryButton}>
                  View {hero.name}
                </Link>
                <Link href={siteConfig.routes.perfumes} className={secondaryButton}>
                  Browse Perfumes
                </Link>
              </div>
            </>
          ) : null}
        </div>
        {hero ? (
          <Link
            href={siteConfig.routes.perfume(hero.slug)}
            className="group flex flex-col gap-3.5 focus-visible:outline-2 focus-visible:outline-offset-4 lg:w-[558px]"
          >
            <div className="relative h-[420px] overflow-hidden bg-[#e7e0d4] lg:h-[650px]">
              <ProductImage
                perfume={hero}
                priority
                className="transition-transform duration-300 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-x-4 bottom-4 flex items-center justify-between bg-[#f7f3ea] px-4 py-3.5 lg:hidden">
                <div>
                  <h2 className="font-display text-2xl font-medium leading-[26px]">{hero.name}</h2>
                  <p className="mt-1 text-xs leading-[18px] text-jp-text-secondary">
                    {hero.scentCue} · {hero.startingPrice}
                  </p>
                </div>
                <span className="text-xs font-semibold leading-[18px]">View →</span>
              </div>
            </div>
            <div className="hidden justify-between text-[11px] leading-4 text-jp-text-secondary lg:flex">
              <span>{hero.name}</span>
              <span>View perfume →</span>
            </div>
          </Link>
        ) : (
          <EmptyState
            eyebrow="Catalogue in preparation"
            title="The first collection is taking shape."
            description="JPScents has not published any perfumes for ordering yet. Please check back when the collection is ready."
            className="min-h-[420px] border-0 lg:h-[650px] lg:w-[558px]"
          />
        )}
        {hero ? (
          <div className="grid gap-2.5 lg:hidden">
            <Link href={siteConfig.routes.perfumes} className={primaryButton}>
              Browse Perfumes
            </Link>
            <Link href={siteConfig.routes.helpMeChoose} className={secondaryButton}>
              Find My Scent
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function MobileFeaturedPerfumes({ products }: { products: PublicPerfumeCard[] }) {
  const [leading, ...compact] = products;
  if (!leading) return null;
  return (
    <div className="lg:hidden">
      <Link
        href={siteConfig.routes.perfume(leading.slug)}
        className="block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="relative h-[315px] bg-[#e7e0d4]">
          <ProductImage perfume={leading} />
        </div>
        <div className="flex items-start justify-between border-t pt-[13px]">
          <div>
            <h3 className="font-display text-[26px] font-medium leading-[30px]">{leading.name}</h3>
            <p className="mt-1 text-xs leading-[18px] text-jp-text-secondary">
              {leading.scentCue} · Available
            </p>
          </div>
          <p className="shrink-0 text-[13px] font-semibold leading-5">
            {leading.startingPrice.replace(/^From /, "")}
          </p>
        </div>
      </Link>
      {compact.length ? (
        <div className="mt-3.5 border-t">
          {compact.slice(0, 2).map((perfume) => (
            <Link
              key={perfume.id}
              href={siteConfig.routes.perfume(perfume.slug)}
              className="flex h-[94px] items-center gap-3.5 border-b py-2.5 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <div className="relative size-[72px] shrink-0 bg-jp-stone">
                <ProductImage perfume={perfume} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-[23px] font-medium leading-[26px]">
                  {perfume.name}
                </h3>
                <p className="mt-1 truncate text-xs leading-[18px] text-jp-text-secondary">
                  {perfume.scentCue}
                </p>
              </div>
              <p className="shrink-0 text-xs font-semibold leading-[18px]">
                {perfume.startingPrice.replace(/^From /, "")}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function FeaturedPerfumes({ products }: { products: PublicPerfumeCard[] }) {
  if (!products.length) return null;
  return (
    <section className="border-y bg-[#fbf9f4] px-5 py-[54px] lg:h-[1100px] lg:bg-[#f7f3ea] lg:px-[104px] lg:pb-[84px] lg:pt-[92px]">
      <div className="mx-auto max-w-[1232px]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[.17em] text-jp-text-secondary lg:tracking-[.18em] lg:text-jp-olive">
              <span className="lg:hidden">Available now</span>
              <span className="hidden lg:inline">Available perfumes</span>
            </p>
            <h2 className="mt-1.5 font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[54px] lg:leading-[58px] lg:tracking-[-.025em]">
              A considered edit<span className="lg:hidden">.</span>
            </h2>
          </div>
          <Link
            href={siteConfig.routes.perfumes}
            className="border-b border-jp-text-primary pb-2 text-xs font-semibold leading-[18px] lg:h-10 lg:text-xs lg:font-bold lg:uppercase lg:leading-4 lg:tracking-[.08em]"
          >
            <span className="lg:hidden">View all →</span>
            <span className="hidden lg:inline">View all perfumes →</span>
          </Link>
        </div>
        <div className="mt-6 lg:mt-[46px]">
          <MobileFeaturedPerfumes products={products} />
          <div className="hidden grid-cols-3 gap-7 lg:grid">
            {products.map((perfume) => (
              <GalleryProductCard key={perfume.id} perfume={perfume} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ScentStartingPoints() {
  return (
    <section className="border-b bg-[#f7f3ea] px-5 py-[54px] lg:h-[650px] lg:bg-jp-surface lg:px-[104px] lg:py-[88px]">
      <div className="mx-auto max-w-[1232px]">
        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase leading-4 tracking-[.17em] text-jp-text-secondary lg:tracking-[.18em] lg:text-jp-olive">
              Start with what you like
            </p>
            <h2 className="mt-[7px] font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[50px] lg:leading-[54px] lg:tracking-[-.025em]">
              Browse by scent character<span className="lg:hidden">.</span>
            </h2>
          </div>
          <p className="hidden w-[330px] text-sm leading-[23px] text-jp-text-secondary lg:block">
            Choose the kind of scent you usually enjoy and start from there.
          </p>
        </div>
        <div className="mt-6 lg:mt-[52px]">
          <ScentCharacterBrowse values={publicScentCharacters} />
        </div>
      </div>
    </section>
  );
}

function GuidancePreview() {
  return (
    <section className="bg-[#e8ede3] px-5 py-[54px] lg:h-[500px] lg:px-[104px] lg:py-[72px]">
      <div className="mx-auto flex h-full max-w-[1232px] items-center justify-between">
        <div className="flex flex-col gap-[22px] lg:w-[650px] lg:gap-5">
          <p className="text-[11px] font-semibold uppercase leading-4 tracking-[.17em] text-jp-olive lg:tracking-[.18em]">
            <span className="lg:hidden">A more guided start</span>
            <span className="hidden lg:inline">Curated guidance</span>
          </p>
          <h2 className="font-display text-[42px] font-medium leading-[44px] lg:text-[54px] lg:leading-[58px] lg:tracking-[-.025em]">
            Not sure what suits you?
          </h2>
          <p className="text-[15px] leading-6 text-[#5f625a] lg:w-[580px] lg:text-base lg:leading-[27px]">
            <span className="lg:hidden">
              Choose the kind of scent, occasion, and time you usually enjoy. We’ll show matching
              available perfumes.
            </span>
            <span className="hidden lg:inline">
              Tell us what you usually enjoy and we’ll narrow down the available perfumes that fit.
            </span>
          </p>
          <Link
            href={siteConfig.routes.helpMeChoose}
            className={`${primaryButton} w-full lg:w-[158px]`}
          >
            Find My Scent
          </Link>
        </div>
        <div className="hidden size-[260px] items-center justify-center border border-jp-olive/20 bg-[#f6f4ed] lg:flex">
          <CircleHelp className="size-[132px] stroke-[1.25] text-jp-olive" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}

function OrderingSteps() {
  return (
    <section
      id="how-ordering-works"
      className="border-b bg-[#fbf9f4] px-5 py-[54px] lg:h-[950px] lg:bg-jp-surface lg:px-[104px] lg:pb-[78px] lg:pt-[88px]"
    >
      <div className="mx-auto max-w-[1232px]">
        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase leading-4 tracking-[.18em] text-jp-olive lg:block">
              From choosing to confirmation
            </p>
            <h2 className="font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[54px] lg:leading-[58px] lg:tracking-[-.025em]">
              How ordering works
            </h2>
          </div>
          <p className="hidden w-[360px] text-sm leading-[23px] text-jp-text-secondary lg:block">
            Payment is not taken online. JPScents sends payment details after your order is placed.
          </p>
        </div>
        <ol className="mt-6 border-t lg:mt-[42px] lg:grid lg:grid-cols-3 lg:border-l">
          {orderingSteps.map((step) => (
            <li
              key={step.number}
              className="flex min-h-[66px] items-center gap-4 border-b py-3 lg:h-[250px] lg:flex-col lg:items-start lg:justify-between lg:border-r lg:p-7"
            >
              <span className="w-7 shrink-0 text-xs font-semibold leading-[18px] text-jp-text-secondary lg:w-auto lg:text-[10px] lg:font-normal lg:leading-3 lg:tracking-[.14em] lg:text-[#8b775e]">
                {step.number}
              </span>
              <span className="text-sm leading-[21px] lg:hidden">{step.mobile}</span>
              <span className="hidden font-display text-[27px] leading-[31px] lg:block">
                {step.desktop}
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-[42px] hidden lg:block">
          <Link href={siteConfig.routes.perfumes} className={`${primaryButton} w-[154px]`}>
            Browse Perfumes
          </Link>
        </div>
      </div>
    </section>
  );
}

function FaqRows({
  items,
  desktop = false,
}: {
  items: readonly { question: string; answer: string }[];
  desktop?: boolean;
}) {
  return (
    <div className="border-t">
      {items.map((item) => (
        <details key={item.question} className="group border-b">
          <summary
            className={`flex cursor-pointer list-none items-center justify-between gap-6 [&::-webkit-details-marker]:hidden ${desktop ? "min-h-[94px]" : "min-h-[62px]"}`}
          >
            <span
              className={desktop ? "font-display text-2xl leading-[30px]" : "text-sm leading-5"}
            >
              {item.question}
            </span>
            <span
              className={`${desktop ? "text-lg leading-[30px]" : "text-xl font-light leading-5"} group-open:hidden`}
              aria-hidden="true"
            >
              +
            </span>
            <span
              className={`${desktop ? "text-lg leading-[30px]" : "text-xl font-light leading-5"} hidden group-open:inline`}
              aria-hidden="true"
            >
              −
            </span>
          </summary>
          <p
            className={`${desktop ? "max-w-3xl pb-7 text-sm leading-6" : "pb-5 pr-8 text-[13px] leading-5"} text-jp-text-secondary`}
          >
            {item.answer}
          </p>
        </details>
      ))}
    </div>
  );
}

function HomepageFaqs() {
  return (
    <section className="bg-[#f7f3ea] px-5 py-[54px] lg:h-[820px] lg:bg-jp-surface lg:px-[104px] lg:py-[92px]">
      <div className="mx-auto max-w-[1232px]">
        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase leading-4 tracking-[.18em] text-jp-olive lg:block">
              Useful before you order
            </p>
            <h2 className="font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[54px] lg:leading-[58px] lg:tracking-[-.025em]">
              Before you order
            </h2>
          </div>
          <p className="hidden w-[380px] text-sm leading-[23px] text-jp-text-secondary lg:block">
            Availability is shown per perfume and size. Payment and delivery details are confirmed
            after you place your order.
          </p>
        </div>
        <div className="mt-6 lg:hidden">
          <FaqRows items={mobileFaqs} />
        </div>
        <div className="mt-11 hidden lg:block">
          <FaqRows items={desktopFaqs} desktop />
        </div>
      </div>
    </section>
  );
}

function ClosingCta() {
  return (
    <section className="flex flex-col items-center gap-[22px] bg-[#eae3d7] px-5 py-[60px] text-center lg:min-h-[650px] lg:justify-center lg:gap-6 lg:bg-[#efe7da] lg:px-[104px] lg:py-20">
      <p className="hidden text-[11px] font-semibold uppercase leading-4 tracking-[.18em] text-jp-olive lg:block">
        Your next perfume
      </p>
      <h2 className="font-display text-[42px] font-medium leading-[44px] lg:text-[60px] lg:leading-[64px] lg:tracking-[-.03em]">
        Ready to find your next scent?
      </h2>
      <p className="hidden w-[530px] text-[15px] leading-[25px] text-jp-text-secondary lg:block">
        Browse the collection or answer a few simple questions to narrow your options.
      </p>
      <div className="grid w-full gap-2.5 lg:w-auto lg:grid-cols-2 lg:gap-3 lg:pt-2">
        <Link href={siteConfig.routes.perfumes} className={primaryButton}>
          Browse Perfumes
        </Link>
        <Link href={siteConfig.routes.helpMeChoose} className={secondaryButton}>
          Find My Scent
        </Link>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const { hero, products } = await getFeaturedPerfumes();
  return (
    <>
      <HomepageHero hero={hero} />
      <FeaturedPerfumes products={products} />
      {hero ? (
        <>
          <ScentStartingPoints />
          <GuidancePreview />
        </>
      ) : null}
      <OrderingSteps />
      <HomepageFaqs />
      {hero ? <ClosingCta /> : null}
    </>
  );
}
