import Link from "next/link";
import { MotionReveal } from "@/components/shared/MotionReveal";
import { siteConfig } from "@/config/site";

export function ClosingCta() {
  return (
    <MotionReveal>
      <section className="flex flex-col items-center gap-6 bg-[#eae3d7] px-5 py-[60px] text-center lg:min-h-[650px] lg:justify-center">
        <h2 className="font-display text-[42px] lg:text-[60px]">Ready to find your next scent?</h2>
        <p className="max-w-[530px] text-jp-text-secondary">
          Browse the collection or answer a few simple questions to narrow your options.
        </p>
        <div className="grid w-full gap-3 lg:w-auto lg:grid-cols-2">
          <Link href={siteConfig.routes.perfumes} className="btn-primary">
            Browse Perfumes
          </Link>
          <Link href={siteConfig.routes.helpMeChoose} className="btn-secondary">
            Find My Scent
          </Link>
        </div>
      </section>
    </MotionReveal>
  );
}
