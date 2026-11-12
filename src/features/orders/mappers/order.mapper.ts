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
    const unit = item.sizeUnitSnapshot ?? variant.sizeUnit;
    const sizeUnit = unit === "ML" ? "mL" : unit || "unit";
    const size = item.sizeValueSnapshot ?? variant.sizeValue;

    return {
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.quantity * item.unitPriceMinor,
      name: item.perfumeNameSnapshot ?? variant.perfume.name,
      sizeLabel: `${size.toString()} ${sizeUnit}`,
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
  const legacy = order.customerNameSnapshot == null;
  return {
    ...toPublicOrder(order, imageUrls),
    legacy,
    customerName: order.customerNameSnapshot ?? order.customer.name,
    whatsappNumber: order.whatsappNumberSnapshot ?? order.customer.whatsappNumber,
    email: legacy ? order.customer.email : order.emailSnapshot,
    deliveryState: order.deliveryStateSnapshot ?? order.customer.deliveryState,
    deliveryCity: order.deliveryCitySnapshot ?? order.customer.deliveryCity,
    deliveryAddress: order.deliveryAddressSnapshot ?? order.customer.deliveryAddress,
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
    customerName: order.customerNameSnapshot ?? order.customer.name,
    whatsappNumber: order.whatsappNumberSnapshot ?? order.customer.whatsappNumber,
    subtotalMinor: order.subtotalMinor,
    status: order.status,
    createdAt: order.createdAt,
    itemCount: order._count.items,
  };
}
