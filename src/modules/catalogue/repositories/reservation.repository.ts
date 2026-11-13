import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";

import { restoreStockForOrder } from "./stock.repository";

const RESERVATION_MS = 30 * 60 * 1000;
type StockLine = { perfumeVariantId: string; quantity: number };

export async function recordStockReservation(
  tx: Prisma.TransactionClient,
  orderId: string,
  paymentAttemptId: string,
  lines: StockLine[],
  now: Date,
) {
  const expiresAt = new Date(now.getTime() + RESERVATION_MS);
  const reservation = await tx.stockReservation.create({
    data: {
      orderId,
      paymentAttemptId,
      createdAt: now,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });
  await tx.stockMovement.createMany({
    data: lines.map(({ perfumeVariantId, quantity }) => ({
      orderId,
      reservationId: reservation.id,
      perfumeVariantId,
      quantity,
      kind: "RESERVE",
    })),
  });
  return reservation.expiresAt;
}

export async function releaseHeldStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  now: Date,
  reason: "EXPIRED" | "CANCELLED",
) {
  const reservation = await tx.stockReservation.findFirst({
    where: {
      orderId,
      status: "HELD",
      ...(reason === "EXPIRED" ? { expiresAt: { lte: now } } : {}),
    },
    select: {
      id: true,
      movements: { where: { kind: "RESERVE" }, select: { perfumeVariantId: true, quantity: true } },
    },
  });
  if (!reservation) {
    return false;
  }
  const claim = await tx.stockReservation.updateMany({
    where: { id: reservation.id, status: "HELD" },
    data: { status: "RELEASED", closedAt: now },
  });
  if (claim.count !== 1) {
    return false;
  }
  if (!reservation.movements.length || !(await restoreStockForOrder(tx, reservation.movements))) {
    throw new Error("The reservation could not restore its recorded stock.");
  }
  await tx.stockMovement.createMany({
    data: reservation.movements.map((line) => ({
      ...line,
      orderId,
      reservationId: reservation.id,
      kind: "RELEASE",
    })),
  });
  return true;
}
