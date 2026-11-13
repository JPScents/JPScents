import "server-only";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";

import { requireAdmin, type AdminIdentity } from "@/modules/access/server";

import { isNigerianDestination, type NigerianDestination } from "../constants/nigeria-regions";
import type { DeliverySetting, DeliverySettingsResult } from "../types";

const settingsSelect = { state: true, enabled: true, feeMinor: true, version: true } as const;

function toSetting(row: Omit<DeliverySetting, "state"> & { state: string }): DeliverySetting {
  if (!isNigerianDestination(row.state)) {
    throw new Error("Delivery data contains an unsupported destination.");
  }
  return { ...row, state: row.state };
}

export async function listDeliverySettings(admin: AdminIdentity | null) {
  requireAdmin(admin);
  const settings = await prisma.deliveryDestination.findMany({
    select: settingsSelect,
    orderBy: { state: "asc" },
  });
  return settings.map(toSetting);
}

class DeliverySettingsConflict extends Error {}

export async function saveDeliverySettings(
  admin: AdminIdentity,
  changes: DeliverySetting[],
): Promise<DeliverySettingsResult> {
  try {
    const settings = await prisma.$transaction(async (tx) => {
      const saved: DeliverySetting[] = [];
      for (const change of changes) {
        const { state, enabled, feeMinor, version } = change;
        const [updated] = await tx.deliveryDestination.updateManyAndReturn({
          where: { state, version },
          data: { enabled, feeMinor, version: { increment: 1 }, updatedBy: admin.id },
          select: settingsSelect,
        });
        if (!updated) {
          throw new DeliverySettingsConflict();
        }
        saved.push(toSetting(updated));
      }
      return saved;
    });
    return { ok: true, settings };
  } catch (error) {
    if (error instanceof DeliverySettingsConflict) {
      return {
        ok: false,
        conflict: true,
        message: "Delivery settings changed. Refresh and reapply your edits.",
      };
    }
    throw error;
  }
}

export async function lockDeliveryQuote(tx: Prisma.TransactionClient, state: NigerianDestination) {
  const [quote] = await tx.$queryRaw<{ feeMinor: number; version: number }[]>`
    SELECT "feeMinor", "version" FROM "DeliveryDestination"
    WHERE "state" = ${state} AND "enabled"
    FOR SHARE
  `;
  return quote ?? null;
}
