import "server-only";

import { prisma } from "@/infrastructure/database/prisma";
import type { PaymentEnvironment } from "@/infrastructure/database/generated/enums";

export async function enqueuePaystackReceipt(
  kind: string,
  providerReference: string,
  environment: PaymentEnvironment,
) {
  await prisma.paystackReceipt.upsert({
    where: { kind_providerReference_environment: { kind, providerReference, environment } },
    create: { kind, providerReference, environment },
    update: {},
    select: { id: true },
  });
}
