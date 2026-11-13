import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

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
  paymentAttemptId?: string,
) {
  const reservation = await tx.stockReservation.findFirst({
    where: {
      orderId,
      status: "HELD",
      paymentAttemptId,
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

export async function consumeReservedStock(
  tx: Prisma.TransactionClient,
  orderId: string,
  paymentAttemptId: string,
  now: Date,
) {
  const reservation = await tx.stockReservation.findUnique({
    where: { orderId_paymentAttemptId: { orderId, paymentAttemptId } },
    select: {
      id: true,
      status: true,
      expiresAt: true,
      movements: { where: { kind: "RESERVE" }, select: { perfumeVariantId: true, quantity: true } },
    },
  });
  if (!reservation || !reservation.movements.length) {
    throw new Error("Payment has no recorded inventory reservation.");
  }
  if (reservation.status !== "HELD" || reservation.expiresAt <= now) {
    return false;
  }
  const claim = await tx.stockReservation.updateMany({
    where: { id: reservation.id, status: "HELD" },
    data: { status: "CONSUMED", closedAt: now },
  });
  if (claim.count !== 1) {
    throw new Error("Reserved inventory changed during allocation.");
  }
  await recordStockAllocation(tx, orderId, paymentAttemptId, reservation.movements);
  return true;
}

export async function recordStockAllocation(
  tx: Prisma.TransactionClient,
  orderId: string,
  paymentAttemptId: string,
  lines: StockLine[],
) {
  const reservation = await tx.stockReservation.findUniqueOrThrow({
    where: { orderId_paymentAttemptId: { orderId, paymentAttemptId } },
    select: { id: true },
  });
  await tx.stockMovement.createMany({
    data: lines.map((line) => ({
      ...line,
      orderId,
      reservationId: reservation.id,
      kind: "ALLOCATE",
    })),
  });
}

export async function hasActiveReservation(
  tx: Prisma.TransactionClient,
  paymentAttemptId: string,
  now: Date,
) {
  const hold = await tx.stockReservation.findFirst({
    where: { paymentAttemptId, status: "HELD", expiresAt: { gt: now } },
    select: { id: true },
  });
  return hold !== null;
}

export async function listDueReservationOrders(now: Date, take: number) {
  const due = await prisma.stockReservation.findMany({
    where: { status: "HELD", expiresAt: { lte: now } },
    select: { orderId: true },
    orderBy: [{ expiresAt: "asc" }, { id: "asc" }],
    take,
  });
  return due.map(({ orderId }) => orderId);
}
