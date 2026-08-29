"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Faq = { question: string; answer: string };

function FaqRow({ item, desktop }: { item: Faq; desktop: boolean }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const reduceMotion = useReducedMotion();
  const answerClass = `${desktop ? "max-w-3xl pb-7 text-sm leading-6" : "pb-5 pr-8 text-[13px] leading-5"} text-jp-text-secondary`;

  return (
    <div className="border-b">
      <button
        type="button"
        className={`flex w-full cursor-pointer items-center justify-between gap-6 text-left focus-visible:outline-2 focus-visible:outline-offset-2 ${desktop ? "min-h-[94px]" : "min-h-[62px]"}`}
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={desktop ? "font-display text-2xl leading-[30px]" : "text-sm leading-5"}>
          {item.question}
        </span>
        <motion.span
          className={desktop ? "text-lg leading-[30px]" : "text-xl font-light leading-5"}
          animate={{ rotate: open ? 45 : 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
          aria-hidden="true"
        >
          +
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={contentId}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <p className={answerClass}>{item.answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function HomepageFaqRows({
  items,
  desktop = false,
}: {
  items: readonly Faq[];
  desktop?: boolean;
}) {
  return (
    <div className="border-t">
      {items.map((item) => (
        <FaqRow key={item.question} item={item} desktop={desktop} />
      ))}
    </div>
  );
}
