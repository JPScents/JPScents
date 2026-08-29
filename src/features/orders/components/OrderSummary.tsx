import Image from "next/image";

import { ProductBottlePlaceholder } from "@/components/shared/public/ProductBottlePlaceholder";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import type { OrderLine } from "../types";

export function OrderSummary({
  order,
}: {
  order: { items: OrderLine[]; subtotalMinor: number; reference?: string };
}) {
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  return (
    <section className="border bg-jp-surface p-5 lg:p-7" aria-label="Order summary">
      <div className="flex justify-between border-b pb-4">
        <p className="text-xs font-semibold uppercase tracking-[.14em] text-jp-olive">
          Order summary
        </p>
        <span className="text-xs text-jp-text-secondary">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>
      </div>
      <div className="divide-y">
        {order.items.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex gap-3 py-4 text-sm">
            <div className="relative h-16 w-12 shrink-0 bg-jp-stone">
              {item.imageUrl ? (
                <Image
                  src={item.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="48px"
                  className="object-contain"
                />
              ) : (
                <ProductBottlePlaceholder />
              )}
            </div>
            <p className="min-w-0 flex-1">
              {item.name}
              <br />
              <span className="text-jp-text-secondary">
                {item.sizeLabel} · Qty {item.quantity}
              </span>
            </p>
            <strong>{formatNairaFromMinor(item.lineTotalMinor)}</strong>
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-3 border-t pt-4 text-sm">
        <div className="flex justify-between">
          <span>Merchandise subtotal</span>
          <strong className="font-display text-3xl">
            {formatNairaFromMinor(order.subtotalMinor)}
          </strong>
        </div>
        <div className="flex justify-between">
          <span>Delivery</span>
          <span className="text-jp-text-secondary">Confirmed after ordering</span>
        </div>
      </div>
      {!order.reference ? (
        <div className="mt-5 bg-jp-green-surface p-4 text-xs leading-5 text-jp-text-secondary">
          <strong className="block uppercase tracking-[.12em] text-jp-olive">
            What happens next
          </strong>
          Your order is saved and a reference is created before WhatsApp opens.
        </div>
      ) : null}
    </section>
  );
}
