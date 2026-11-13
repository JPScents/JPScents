import "server-only";

import { prisma } from "@/infrastructure/database/prisma";

export async function startReconciliationRun(trigger: "SCHEDULED" | "ADMIN") {
  return prisma.commerceReconciliationRun.create({ data: { trigger }, select: { id: true } });
}

export async function finishReconciliationRun(
  id: string,
  result: { expired: number; payments: number; refunds: number; errors: number },
) {
  await prisma.commerceReconciliationRun.update({
    where: { id },
    data: { ...result, completedAt: new Date() },
  });
}
