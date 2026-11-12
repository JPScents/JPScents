import "server-only";

import { getCurrentAdmin } from "@/lib/auth/admin";
import { getPerfumeImageUrl } from "@/lib/supabase/storage";

import { toPublicOrder, toAdminOrder, toAdminOrderRow } from "../mappers/order.mapper";
import { parseOrderSubmission } from "../parsers/order-submission.parser";
import {
  findOrderConfirmation,
  findAdminOrder,
  listOrderRecords,
  countOrdersAwaitingPayment,
  countOrdersSince,
  createOrderWithStockDeduction,
  type PublicOrderRecord,
} from "../repositories/order.repository";
import type { OrderFilters } from "../types";

function logOrderFailure(operation: string, error: unknown) {
  const failure = error as {
    name?: string;
    code?: string;
    cause?: { kind?: string; code?: string; constraint?: string; table?: string };
  };
  console.error(`[orders] ${operation} failed`, {
    name: failure?.name,
    code: failure?.code,
    causeKind: failure?.cause?.kind,
    causeCode: failure?.cause?.code,
    constraint: failure?.cause?.constraint,
    table: failure?.cause?.table,
  });
}

async function resolveOrderImages(order: PublicOrderRecord) {
  const paths = [
    ...new Set(
      order.items.flatMap((item) => {
        const path = item.perfumeVariant.perfume.images[0]?.path;
        return path ? [path] : [];
      }),
    ),
  ];
  const entries = await Promise.all(
    paths.map(async (path) => [path, await getPerfumeImageUrl(path)] as const),
  );
  return new Map(entries);
}

export async function getOrderConfirmation(confirmationToken: string | undefined) {
  if (!confirmationToken || confirmationToken.length < 40) {
    return null;
  }
  const order = await findOrderConfirmation(confirmationToken);
  return order ? toPublicOrder(order, await resolveOrderImages(order)) : null;
}

export async function listOrders(filters: OrderFilters = {}) {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
  const query = typeof filters.query === "string" ? filters.query.trim().slice(0, 120) : "";
  const orders = await listOrderRecords({ ...filters, query });
  return orders.map(toAdminOrderRow);
}

export async function getOrderByReference(reference: string) {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
  const order = await findAdminOrder(reference);
  return order ? toAdminOrder(order, await resolveOrderImages(order)) : null;
}

export async function getOrdersAdminOverview() {
  if (!(await getCurrentAdmin())) {
    throw new Error("You are not authorized.");
  }
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));

  const [awaitingAction, ordersThisWeek, recentOrders] = await Promise.all([
    countOrdersAwaitingPayment(),
    countOrdersSince(start),
    listOrderRecords({}, 3),
  ]);
  return { awaitingAction, ordersThisWeek, recentOrders: recentOrders.map(toAdminOrderRow) };
}

export async function createOrder(linesRaw: unknown, checkoutRaw: unknown, submissionKey: unknown) {
  const parsed = parseOrderSubmission(linesRaw, checkoutRaw, submissionKey);
  if (parsed.error !== undefined) {
    return { error: parsed.error } as const;
  }
  if (parsed.errors !== undefined) {
    return { errors: parsed.errors } as const;
  }
  try {
    const result = await createOrderWithStockDeduction(
      parsed.lines,
      parsed.input,
      parsed.submissionKey,
    );
    if ("error" in result) {
      return result;
    }
    return {
      order: toPublicOrder(result.order, await resolveOrderImages(result.order)),
      confirmationToken: result.order.confirmationToken,
      duplicate: result.duplicate,
    } as const;
  } catch (error) {
    logOrderFailure("createOrder", error);
    return { error: "We could not create your order. Please try again." } as const;
  }
}
