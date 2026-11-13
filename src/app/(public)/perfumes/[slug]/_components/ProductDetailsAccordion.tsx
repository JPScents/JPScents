import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/ui/primitives/accordion";
import { preferenceLabel, type PublicPerfumeDetail } from "@/modules/catalogue";

function Trigger({ title, summary }: { title: string; summary: string }) {
  return (
    <span>
      <span className="block text-[13px] font-semibold leading-5">{title}</span>
      <span className="block text-xs leading-[18px] text-jp-text-secondary">{summary}</span>
    </span>
  );
}

export function ProductDetailsAccordion({ perfume }: { perfume: PublicPerfumeDetail }) {
  const characters = perfume.scentCharacters.map(preferenceLabel).join(" · ");
  const occasions = perfume.occasions.map(preferenceLabel).join(" · ");
  const times = perfume.timesOfDay.map(preferenceLabel).join(" · ");

  return (
    <Accordion type="single" collapsible className="mt-8 border-t">
      <AccordionItem value="scent-profile" className="lg:hidden">
        <AccordionTrigger className="min-h-[74px]">
          <Trigger title="Scent profile" summary={characters || "Perfume character"} />
        </AccordionTrigger>
        <AccordionContent className="space-y-3 pb-5 text-[13px] leading-5">
          <dl className="space-y-3">
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
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="delivery">
        <AccordionTrigger className="min-h-[74px]">
          <Trigger title="Delivery" summary="Timing and cost confirmed for your order" />
        </AccordionTrigger>
        <AccordionContent className="pb-5 text-[13px] leading-5 text-jp-text-secondary">
          Delivery timing and cost are confirmed after you place the order.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="payment">
        <AccordionTrigger className="min-h-[74px]">
          <Trigger title="Payment" summary="Details are sent after you place the order" />
        </AccordionTrigger>
        <AccordionContent className="pb-5 text-[13px] leading-5 text-jp-text-secondary">
          No payment is taken online. Continue on WhatsApp after checkout to receive the payment
          details.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
