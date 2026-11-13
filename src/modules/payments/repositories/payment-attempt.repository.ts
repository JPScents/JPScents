import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import type { PaymentEnvironment } from "@/infrastructure/database/generated/enums";

export async function createPaymentAttempt(
  tx: Prisma.TransactionClient,
  orderId: string,
  amountMinor: number,
  environment: PaymentEnvironment,
) {
  return tx.paymentAttempt.create({
    data: {
      orderId,
      amountMinor,
      currency: "NGN",
      environment,
      providerReference: `jpscents-${randomUUID()}`,
    },
    select: { id: true, providerReference: true },
  });
}
