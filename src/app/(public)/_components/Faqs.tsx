import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/primitives/accordion";

const commonFaqs = [
  {
    question: "Is this perfume available in my preferred size?",
    answer:
      "Each perfume page shows availability by size. An unavailable size cannot be added to your cart.",
  },
  {
    question: "How long does the fragrance last?",
    answer:
      "Longevity varies by perfume, application, and skin. Ask JPScents about a specific perfume before ordering if this is important to you.",
  },
] as const;
export function Faqs({ onlineCheckout }: { onlineCheckout: boolean }) {
  const faqs = [
    commonFaqs[0],
    onlineCheckout
      ? {
          question: "How do I pay?",
          answer: "Review your total in Checkout, then complete your payment on Paystack.",
        }
      : {
          question: "When will I receive payment details?",
          answer:
            "Payment details are shared after your order is saved and you continue with your order reference on WhatsApp.",
        },
    {
      question: "How is delivery arranged?",
      answer: onlineCheckout
        ? "Choose an available Nigerian state or FCT in Checkout to see the delivery fee before paying."
        : "Delivery timing and cost are confirmed with you after the order is placed.",
    },
    commonFaqs[1],
  ];
  return (
    <section className="bg-[#f7f3ea] px-5 py-[54px] lg:h-[820px] lg:bg-jp-surface lg:px-[104px] lg:py-[92px]">
      <div className="mx-auto max-w-[1232px]">
        <div className="lg:flex lg:items-end lg:justify-between">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase tracking-[.18em] text-jp-olive lg:block">
              Useful before you order
            </p>
            <h2 className="font-display text-[38px] font-medium leading-[42px] lg:mt-3 lg:text-[54px]">
              Before you order
            </h2>
          </div>
          <p className="hidden w-[380px] text-sm leading-[23px] text-jp-text-secondary lg:block">
            {onlineCheckout
              ? "Availability is shown per perfume and size. Review your delivery fee and total in Checkout."
              : "Availability is shown per perfume and size. Payment and delivery details are confirmed after you place your order."}
          </p>
        </div>
        <Accordion type="single" collapsible className="mt-6 border-t lg:mt-11">
          {faqs.map((item) => (
            <AccordionItem key={item.question} value={item.question}>
              <AccordionTrigger className="min-h-[62px] text-sm leading-5 lg:min-h-[94px] lg:font-display lg:text-2xl">
                {item.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 pr-8 text-[13px] leading-5 text-jp-text-secondary lg:max-w-3xl lg:pb-7 lg:text-sm lg:leading-6">
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
