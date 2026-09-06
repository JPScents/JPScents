import "server-only";

import { Prisma } from "@/db/generated/client";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";

export const orderInclude = {
  customer: true,
  items: {
    include: {
      perfumeVariant: {
        include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  },
  statusEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export async function projectOrder(
  order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>,
  includePrivate = false,
) {
  const items = await Promise.all(
    order.items.map(async (item) => ({
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.quantity * item.unitPriceMinor,
      name: item.perfumeVariant.perfume.name,
      slug: item.perfumeVariant.perfume.slug,
      sizeLabel: `${item.perfumeVariant.sizeValue.toString()} ${item.perfumeVariant.sizeUnit === "ML" ? "mL" : item.perfumeVariant.sizeUnit || "unit"}`,
      imageUrl: await getPerfumeImageUrl(item.perfumeVariant.perfume.images[0]?.path),
    })),
  );

  return {
    reference: order.reference,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    items,
    ...(includePrivate
      ? {
          customerName: order.customer.name,
          whatsappNumber: order.customer.whatsappNumber,
          email: order.customer.email,
          deliveryState: order.customer.deliveryState,
          deliveryCity: order.customer.deliveryCity,
          deliveryAddress: order.customer.deliveryAddress,
          orderNote: order.orderNote,
          events: order.statusEvents,
        }
      : {}),
  };
}
