import type {
  AdminOrderRecord,
  PublicOrderRecord,
  OrderRowRecord,
} from "../repositories/order.repository";
import type { AdminOrder, AdminOrderRow, PublicOrder } from "../types";

type OrderImageUrls = ReadonlyMap<string, string | undefined>;

function toOrderItems(order: PublicOrderRecord, imageUrls: OrderImageUrls) {
  return order.items.map((item) => {
    const variant = item.perfumeVariant;
    const sizeUnit = variant.sizeUnit === "ML" ? "mL" : variant.sizeUnit || "unit";

    return {
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.quantity * item.unitPriceMinor,
      name: variant.perfume.name,
      sizeLabel: `${variant.sizeValue.toString()} ${sizeUnit}`,
      imageUrl: imageUrls.get(variant.perfume.images[0]?.path ?? ""),
    };
  });
}

export function toPublicOrder(order: PublicOrderRecord, imageUrls: OrderImageUrls): PublicOrder {
  return {
    reference: order.reference,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    items: toOrderItems(order, imageUrls),
  };
}

export function toAdminOrder(order: AdminOrderRecord, imageUrls: OrderImageUrls): AdminOrder {
  return {
    ...toPublicOrder(order, imageUrls),
    customerName: order.customer.name,
    whatsappNumber: order.customer.whatsappNumber,
    email: order.customer.email,
    deliveryState: order.customer.deliveryState,
    deliveryCity: order.customer.deliveryCity,
    deliveryAddress: order.customer.deliveryAddress,
    orderNote: order.orderNote,
    events: order.statusEvents.map((event) => ({
      id: event.id,
      fromStatus: event.fromStatus,
      toStatus: event.toStatus,
      createdAt: event.createdAt,
    })),
  };
}

export function toAdminOrderRow(order: OrderRowRecord): AdminOrderRow {
  return {
    reference: order.reference,
    customerName: order.customer.name,
    whatsappNumber: order.customer.whatsappNumber,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    itemCount: order._count.items,
  };
}
