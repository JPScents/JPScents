import "server-only";

import { Prisma } from "@/db/generated/client";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";

import type { AdminOrder, PublicOrder } from "./types";

export const publicOrderInclude = {
  items: {
    include: {
      perfumeVariant: {
        include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
      },
    },
  },
} satisfies Prisma.OrderInclude;

export const adminOrderInclude = {
  ...publicOrderInclude,
  customer: true,
  statusEvents: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

type PublicOrderRecord = Prisma.OrderGetPayload<{ include: typeof publicOrderInclude }>;
type AdminOrderRecord = Prisma.OrderGetPayload<{ include: typeof adminOrderInclude }>;

async function projectItems(order: PublicOrderRecord) {
  const items = await Promise.all(
    order.items.map(async (item) => ({
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.quantity * item.unitPriceMinor,
      name: item.perfumeVariant.perfume.name,
      sizeLabel: `${item.perfumeVariant.sizeValue.toString()} ${item.perfumeVariant.sizeUnit === "ML" ? "mL" : item.perfumeVariant.sizeUnit || "unit"}`,
      imageUrl: await getPerfumeImageUrl(item.perfumeVariant.perfume.images[0]?.path),
    })),
  );
  return items;
}

export async function projectPublicOrder(order: PublicOrderRecord): Promise<PublicOrder> {
  return {
    reference: order.reference,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    items: await projectItems(order),
  };
}

export async function projectAdminOrder(order: AdminOrderRecord): Promise<AdminOrder> {
  return {
    ...(await projectPublicOrder(order)),
    customerName: order.customer.name,
    whatsappNumber: order.customer.whatsappNumber,
    email: order.customer.email,
    deliveryState: order.customer.deliveryState,
    deliveryCity: order.customer.deliveryCity,
    deliveryAddress: order.customer.deliveryAddress,
    orderNote: order.orderNote,
    events: order.statusEvents,
  };
}
