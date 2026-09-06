"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const faqs = [
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

function FaqRow({ item }: { item: (typeof faqs)[number] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const reduce = useReducedMotion();
  return (
    <div className="border-b">
      <button
        type="button"
        className="flex min-h-[62px] w-full items-center justify-between gap-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 lg:min-h-[94px]"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-sm leading-5 lg:font-display lg:text-2xl lg:leading-[30px]">
          {item.question}
        </span>
        <motion.span
          animate={{ rotate: open ? 45 : 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
          aria-hidden="true"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-8 text-[13px] leading-5 text-jp-text-secondary lg:max-w-3xl lg:pb-7 lg:text-sm lg:leading-6">
              {item.answer}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Faqs() {
  return (
    <section className="bg-[#f7f3ea] px-5 py-[54px] lg:h-[820px] lg:bg-jp-surface lg:px-[104px] lg:py-[92px]">
      <div className="mx-auto max-w-[1232px]">
        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase leading-4 tracking-[.18em] text-jp-olive lg:block">
              Useful before you order
            </p>
            <h2 className="font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[54px] lg:leading-[58px]">
              Before you order
            </h2>
          </div>
          <p className="hidden w-[380px] text-sm leading-[23px] text-jp-text-secondary lg:block">
            Availability is shown per perfume and size. Payment and delivery details are confirmed
            after you place your order.
          </p>
        </div>
        <div className="mt-6 lg:mt-11">
          <div className="border-t">
            {faqs.map((item) => (
              <FaqRow key={item.question} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
