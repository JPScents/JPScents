import "server-only";

import { randomBytes } from "crypto";

import { OrderStatus, Prisma } from "@/db/generated/client";
import { prisma } from "@/db/prisma";
import { commerceConfig } from "@/config/commerce";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrderCartLine = { perfumeVariantId: string; quantity: number };
export type CheckoutInput = { customerName: string; whatsappNumber: string; email?: string; deliveryArea: string; deliveryAddress: string; orderNote?: string };
export type OrderFilters = { query?: string; status?: OrderStatus };
export const orderStatuses = Object.values(OrderStatus);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const clean = (value: unknown, maximum: number) => typeof value === "string" ? value.trim().slice(0, maximum) : "";

export function parseCheckoutInput(value: unknown): { input?: CheckoutInput; errors: Record<string, string> } {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const input = { customerName: clean(raw.customerName, 120), whatsappNumber: normalizeWhatsappNumber(clean(raw.whatsappNumber, 32)), email: clean(raw.email, 254), deliveryArea: clean(raw.deliveryArea, 120), deliveryAddress: clean(raw.deliveryAddress, 500), orderNote: clean(raw.orderNote, 500) };
  const errors: Record<string, string> = {};
  if (!input.customerName) errors.customerName = "Enter your full name.";
  if (!input.whatsappNumber) errors.whatsappNumber = "Enter a valid WhatsApp number.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "Enter a valid email address.";
  if (!input.deliveryArea) errors.deliveryArea = "Enter your delivery area.";
  if (!input.deliveryAddress) errors.deliveryAddress = "Enter your delivery address.";
  return { input: Object.keys(errors).length ? undefined : { ...input, email: input.email || undefined, orderNote: input.orderNote || undefined }, errors };
}

export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const normalized = /^0[7-9]\d{9}$/.test(digits) ? `234${digits.slice(1)}` : digits;
  return /^\d{7,15}$/.test(normalized) ? normalized : "";
}

function parseLines(lines: unknown): OrderCartLine[] | null {
  if (!Array.isArray(lines) || !lines.length) return null;
  const merged = new Map<string, number>();
  for (const line of lines) {
    if (!line || typeof line !== "object") return null;
    const { perfumeVariantId, quantity } = line as Partial<OrderCartLine>;
    if (typeof perfumeVariantId !== "string" || !UUID.test(perfumeVariantId) || !Number.isSafeInteger(quantity) || quantity === undefined || quantity < 1 || quantity > 99) return null;
    merged.set(perfumeVariantId, (merged.get(perfumeVariantId) ?? 0) + quantity);
  }
  if ([...merged.values()].some((quantity) => quantity > 99)) return null;
  return [...merged].map(([perfumeVariantId, quantity]) => ({ perfumeVariantId, quantity }));
}

function reference() { return `${commerceConfig.orderReference.prefix}${randomBytes(5).toString("hex").toUpperCase()}`; }
function token() { return randomBytes(32).toString("base64url"); }
const orderInclude = { items: { include: { perfumeVariant: { include: { perfume: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } } } }, statusEvents: { orderBy: { createdAt: "asc" } } } satisfies Prisma.OrderInclude;

class OrderConflict extends Error {}

async function signedImageUrl(path?: string) {
  if (!path) return undefined;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.storage.from("perfume-images").createSignedUrl(path, 3600);
    return result.error ? undefined : result.data.signedUrl;
  } catch {
    return undefined;
  }
}

async function projectOrder(order: Prisma.OrderGetPayload<{ include: typeof orderInclude }>, includePrivate = false) {
  const items = await Promise.all(order.items.map(async (item) => ({
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.quantity * item.unitPriceMinor,
    name: item.perfumeVariant.perfume.name,
    slug: item.perfumeVariant.perfume.slug,
    sizeLabel: `${item.perfumeVariant.sizeValue.toString()} ${item.perfumeVariant.sizeUnit === "ML" ? "mL" : item.perfumeVariant.sizeUnit || "unit"}`,
    imageUrl: await signedImageUrl(item.perfumeVariant.perfume.images[0]?.path),
  })));
  return { reference: order.reference, subtotalMinor: order.subtotalMinor, status: order.status, createdAt: order.createdAt, items, ...(includePrivate ? { customerName: order.customerName, whatsappNumber: order.whatsappNumber, email: order.email, deliveryArea: order.deliveryArea, deliveryAddress: order.deliveryAddress, orderNote: order.orderNote, events: order.statusEvents } : {}) };
}

export async function createOrder(linesRaw: unknown, checkoutRaw: unknown, submissionKey: unknown) {
  const lines = parseLines(linesRaw); const parsed = parseCheckoutInput(checkoutRaw);
  if (!lines) return { error: "Your cart is empty or invalid. Return to Cart and try again." } as const;
  if (!parsed.input) return { errors: parsed.errors } as const;
  const input = parsed.input;
  if (typeof submissionKey !== "string" || !UUID.test(submissionKey)) return { error: "Unable to safely place this order. Please refresh and try again." } as const;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const duplicate = await tx.order.findUnique({ where: { submissionKey }, include: orderInclude });
      if (duplicate) return { order: duplicate, duplicate: true };
      const variants = await tx.perfumeVariant.findMany({ where: { id: { in: lines.map((line) => line.perfumeVariantId) }, perfume: { status: "PUBLISHED" } } });
      if (variants.length !== lines.length) throw new OrderConflict("One or more perfumes are no longer available.");
      const byId = new Map(variants.map((variant) => [variant.id, variant]));
      for (const line of lines) {
        const updated = await tx.perfumeVariant.updateMany({ where: { id: line.perfumeVariantId, quantity: { gte: line.quantity }, perfume: { status: "PUBLISHED" } }, data: { quantity: { decrement: line.quantity } } });
        if (updated.count !== 1) throw new OrderConflict("One or more perfumes are no longer available in the requested quantity.");
      }
      const subtotalMinor = lines.reduce((total, line) => total + byId.get(line.perfumeVariantId)!.priceMinor * line.quantity, 0);
      const created = await tx.order.create({ data: { reference: reference(), confirmationToken: token(), submissionKey, ...input, subtotalMinor, items: { create: lines.map((line) => ({ perfumeVariantId: line.perfumeVariantId, quantity: line.quantity, unitPriceMinor: byId.get(line.perfumeVariantId)!.priceMinor })) }, statusEvents: { create: { toStatus: "NEW" } } } });
      const complete = await tx.order.findUniqueOrThrow({ where: { id: created.id }, include: orderInclude });
      return { order: complete, duplicate: false };
    });
    return { order: await projectOrder(result.order), confirmationToken: result.order.confirmationToken, duplicate: result.duplicate } as const;
  } catch (error) { return { error: error instanceof OrderConflict ? error.message : "We could not create your order. Please try again." } as const; }
}

export async function getOrderConfirmation(confirmationToken: string | undefined) {
  if (!confirmationToken || confirmationToken.length < 40) return null;
  const order = await prisma.order.findUnique({ where: { confirmationToken }, include: orderInclude });
  return order ? projectOrder(order) : null;
}

export async function listOrders(filters: OrderFilters = {}) {
  const query = clean(filters.query, 120);
  const rows = await prisma.order.findMany({ where: { ...(filters.status ? { status: filters.status } : {}), ...(query ? { OR: [{ reference: { contains: query, mode: "insensitive" } }, { customerName: { contains: query, mode: "insensitive" } }, { whatsappNumber: { contains: query } }] } : {}) }, include: { _count: { select: { items: true } } }, orderBy: { createdAt: "desc" } });
  return rows.map((order) => ({ reference: order.reference, customerName: order.customerName, whatsappNumber: order.whatsappNumber, subtotalMinor: order.subtotalMinor, status: order.status, createdAt: order.createdAt, itemCount: order._count.items }));
}

export async function getOrderByReference(referenceValue: string) { const order = await prisma.order.findUnique({ where: { reference: referenceValue }, include: orderInclude }); return order ? projectOrder(order, true) : null; }

export async function updateOrderStatus(referenceValue: string, nextStatus: unknown) {
  if (typeof nextStatus !== "string" || !orderStatuses.includes(nextStatus as OrderStatus)) return { error: "Choose a valid order status." } as const;
  try { return await prisma.$transaction(async (tx) => { const order = await tx.order.findUnique({ where: { reference: referenceValue } }); if (!order) return { error: "Order not found." } as const; if (order.status === nextStatus) return { unchanged: true } as const; await tx.order.update({ where: { id: order.id }, data: { status: nextStatus as OrderStatus, statusEvents: { create: { fromStatus: order.status, toStatus: nextStatus as OrderStatus } } } }); return { ok: true } as const; }); } catch { return { error: "Unable to update this order." } as const; }
}

export async function getAdminOverview() {
  const start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const [awaitingAction, availablePerfumes, zeroStockVariants, ordersThisWeek, recentOrders, attention, bestseller] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["NEW", "AWAITING_PAYMENT"] } } }), prisma.perfume.count({ where: { status: "PUBLISHED", variants: { some: { quantity: { gt: 0 } } } } }), prisma.perfumeVariant.count({ where: { quantity: 0 } }), prisma.order.count({ where: { createdAt: { gte: start } } }), listOrders(), prisma.perfume.findMany({ where: { OR: [{ status: "DRAFT" }, { variants: { none: { quantity: { gt: 0 } } } }] }, select: { id: true, name: true, status: true }, take: 5, orderBy: { updatedAt: "desc" } }), prisma.perfume.findFirst({ where: { isBestseller: true }, select: { id: true, name: true } }),
  ]);
  return { awaitingAction, availablePerfumes, zeroStockVariants, ordersThisWeek, recentOrders: recentOrders.slice(0, 3), attention, bestseller };
}
