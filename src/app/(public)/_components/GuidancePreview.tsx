import Link from "next/link";
import { CircleHelp } from "lucide-react";
import { MotionReveal } from "@/ui/MotionReveal";
import { siteConfig } from "@/config/site";

export function GuidancePreview() {
  return (
    <MotionReveal>
      <section className="bg-[#e8ede3] px-5 py-[54px] lg:px-[104px] lg:py-[72px]">
        <div className="mx-auto flex max-w-[1232px] items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.17em] text-jp-olive">
              Curated guidance
            </p>
            <h2 className="mt-3 font-display text-[42px] lg:text-[54px]">
              Not sure what suits you?
            </h2>
            <p className="mt-4 text-jp-text-secondary">
              Tell us what you usually enjoy and we’ll narrow down the available perfumes that fit.
            </p>
            <Link href={siteConfig.routes.helpMeChoose} className="btn-primary mt-5">
              Find My Scent
            </Link>
          </div>
          <CircleHelp className="hidden size-[132px] text-jp-olive lg:block" aria-hidden="true" />
        </div>
      </section>
    </MotionReveal>
  );
}
