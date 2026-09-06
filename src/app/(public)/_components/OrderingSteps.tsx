import Link from "next/link";
import { MotionReveal } from "@/components/shared/MotionReveal";
import { siteConfig } from "@/config/site";
const steps = [
  "Choose your perfume and size",
  "Add one or more perfumes to Cart",
  "Checkout and Place Order",
  "Receive your JPScents Order Reference",
  "Continue on WhatsApp with your reference",
  "Receive payment details and confirm delivery",
];
export function OrderingSteps() {
  return (
    <MotionReveal>
      <section
        id="how-ordering-works"
        className="border-b bg-jp-surface px-5 py-[54px] lg:px-[104px] lg:py-[88px]"
      >
        <div className="mx-auto max-w-[1232px]">
          <h2 className="font-display text-[38px] lg:text-[54px]">How ordering works</h2>
          <ol className="mt-6 border-t lg:grid lg:grid-cols-3">
            {steps.map((step, index) => (
              <li
                key={step}
                className="flex min-h-[66px] items-center gap-4 border-b py-3 lg:min-h-[200px] lg:flex-col lg:items-start lg:justify-between lg:p-7"
              >
                <span className="text-xs text-jp-text-secondary">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-sm lg:font-display lg:text-[27px]">{step}</span>
              </li>
            ))}
          </ol>
          <Link href={siteConfig.routes.perfumes} className="btn-primary mt-8">
            Browse Perfumes
          </Link>
        </div>
      </section>
    </MotionReveal>
  );
}
