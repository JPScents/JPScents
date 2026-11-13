import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import { requireAdmin, type AdminIdentity } from "@/modules/access/server";
import { listUnresolvedNotifications } from "@/modules/notifications/server";
import { listUnresolvedPayments, listUnresolvedRefunds } from "@/modules/payments/server";

const runSelect = {
  id: true,
  trigger: true,
  startedAt: true,
  completedAt: true,
  expired: true,
  payments: true,
  refunds: true,
  notifications: true,
  errors: true,
  errorCounts: true,
} as const;

export async function startReconciliationRun(trigger: "SCHEDULED" | "ADMIN") {
  return prisma.commerceReconciliationRun.create({ data: { trigger }, select: { id: true } });
}

export async function finishReconciliationRun(
  id: string,
  result: {
    expired: number;
    payments: number;
    refunds: number;
    notifications: number;
    errors: number;
  },
  errorCounts: Record<string, number>,
) {
  await prisma.commerceReconciliationRun.update({
    where: { id },
    data: { ...result, errorCounts, completedAt: new Date() },
  });
}

export async function getCommerceOperations(admin: AdminIdentity | null) {
  requireAdmin(admin);
  const take = 11;
  const [lastScheduledSuccess, runs, payments, refunds, notifications] = await Promise.all([
    prisma.commerceReconciliationRun.findFirst({
      where: { trigger: "SCHEDULED", errors: 0, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      select: { completedAt: true },
    }),
    prisma.commerceReconciliationRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: runSelect,
    }),
    listUnresolvedPayments(take),
    listUnresolvedRefunds(take),
    listUnresolvedNotifications(take),
  ]);
  return {
    checkedAt: Date.now(),
    lastScheduledSuccess: lastScheduledSuccess?.completedAt,
    runs,
    payments,
    refunds,
    notifications,
  };
}
