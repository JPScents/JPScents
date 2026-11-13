import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { Prisma } from "@/infrastructure/database/generated/client";
import { prisma } from "@/infrastructure/database/prisma";
import { requireAdmin, type AdminIdentity } from "@/modules/access/server";
import { quotePublishedVariants } from "@/modules/catalogue/server";

import type { OrderCartLine } from "../types";

const LINK_LIFETIME = 24 * 60 * 60 * 1000;

export async function listCheckoutDrafts(admin: AdminIdentity | null) {
  requireAdmin(admin);
  return prisma.checkoutDraft.findMany({
    take: 50,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      status: true,
      version: true,
      contactName: true,
      expiresAt: true,
      _count: { select: { lines: true } },
    },
  });
}

export async function getAdminCheckoutDraft(admin: AdminIdentity | null, id: string) {
  requireAdmin(admin);
  const row = await prisma.checkoutDraft.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      version: true,
      contactName: true,
      contactEmail: true,
      expiresAt: true,
      lines: {
        select: {
          perfumeVariantId: true,
          quantity: true,
          quotedPriceMinor: true,
          variant: {
            select: {
              sizeValue: true,
              quantity: true,
              priceMinor: true,
              perfume: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  return (
    row && {
      ...row,
      lines: row.lines.map(({ variant, ...line }) => ({
        ...line,
        name: variant.perfume.name,
        size: variant.sizeValue.toString(),
        available: variant.quantity,
        priceMinor: variant.priceMinor,
      })),
    }
  );
}

type DraftInput = {
  lines: OrderCartLine[];
  contactName: string | null;
  contactEmail: string | null;
};

class DraftConflict extends Error {}

export async function saveCheckoutDraft(
  admin: AdminIdentity,
  input: DraftInput,
  existing?: { id: string; version: number },
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const current = existing
        ? await tx.checkoutDraft.findUnique({
            where: { id: existing.id, version: existing.version, status: { not: "CHECKED_OUT" } },
            select: { id: true },
          })
        : null;
      if (existing && !current) {
        throw new DraftConflict();
      }
      if (existing) {
        const claim = await tx.checkoutDraft.updateMany({
          where: { id: existing.id, version: existing.version, status: { not: "CHECKED_OUT" } },
          data: {
            status: "DRAFT",
            capabilityHash: null,
            expiresAt: null,
            version: { increment: 1 },
            contactName: input.contactName,
            contactEmail: input.contactEmail,
            updatedBy: admin.id,
          },
        });
        if (claim.count !== 1) {
          throw new DraftConflict();
        }
        await tx.checkoutDraftLine.deleteMany({ where: { draftId: existing.id } });
        await tx.checkoutDraftLine.createMany({
          data: input.lines.map((line) => ({ ...line, draftId: existing.id })),
        });
        return { id: existing.id } as const;
      }
      return tx.checkoutDraft.create({
        data: {
          contactName: input.contactName,
          contactEmail: input.contactEmail,
          createdBy: admin.id,
          updatedBy: admin.id,
          lines: { create: input.lines },
        },
        select: { id: true },
      });
    });
  } catch (error) {
    if (error instanceof DraftConflict) {
      return { error: "This draft changed. Refresh and try again." } as const;
    }
    throw error;
  }
}

export async function lockCheckoutDraft(tx: Prisma.TransactionClient, id: string) {
  const [row] = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "CheckoutDraft" WHERE "id" = ${id}::uuid FOR UPDATE
  `;
  return row !== undefined;
}

export async function issueCheckoutDraft(
  admin: AdminIdentity,
  id: string,
  version: number,
  expectedPrices: ReadonlyMap<string, number>,
) {
  requireAdmin(admin);
  const token = randomBytes(32).toString("base64url");
  return prisma.$transaction(async (tx) => {
    if (!(await lockCheckoutDraft(tx, id))) {
      return { error: "Draft not found." } as const;
    }
    const draft = await tx.checkoutDraft.findUnique({
      where: { id, version, status: { not: "CHECKED_OUT" } },
      select: { lines: { select: { perfumeVariantId: true, quantity: true } } },
    });
    if (!draft?.lines.length) {
      return {
        error: "Refresh the draft and choose available perfumes before issuing a link.",
      } as const;
    }
    const prices = await quotePublishedVariants(tx, draft.lines);
    if (!prices) {
      return {
        error: "One or more draft items are unavailable in the requested quantity.",
      } as const;
    }
    if (
      expectedPrices.size !== prices.size ||
      [...prices].some(([variantId, item]) => expectedPrices.get(variantId) !== item.priceMinor)
    ) {
      return {
        error: "Item prices changed. Review the updated prices before issuing a link.",
        stalePrices: true,
      } as const;
    }
    for (const line of draft.lines) {
      const item = prices.get(line.perfumeVariantId);
      if (!item) {
        throw new Error("Missing locked quote price.");
      }
      await tx.checkoutDraftLine.update({
        where: {
          draftId_perfumeVariantId: { draftId: id, perfumeVariantId: line.perfumeVariantId },
        },
        data: { quotedPriceMinor: item.priceMinor },
      });
    }
    const expiresAt = new Date(Date.now() + LINK_LIFETIME);
    await tx.checkoutDraft.update({
      where: { id },
      data: {
        status: "ISSUED",
        capabilityHash: hashQuoteToken(token),
        expiresAt,
        version: { increment: 1 },
        updatedBy: admin.id,
      },
    });
    return { token, expiresAt } as const;
  });
}

export async function revokeCheckoutDraft(admin: AdminIdentity, id: string, version: number) {
  const changed = await prisma.checkoutDraft.updateMany({
    where: { id, version, status: "ISSUED" },
    data: {
      status: "REVOKED",
      capabilityHash: null,
      expiresAt: null,
      version: { increment: 1 },
      updatedBy: admin.id,
    },
  });
  return changed.count === 1
    ? ({ ok: true } as const)
    : ({ error: "This draft changed. Refresh and try again." } as const);
}

export function hashQuoteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hasCurrentCheckoutQuote(
  quote: { capabilityHash: string | null; expiresAt: Date | null },
  token: string | undefined,
  now: Date,
) {
  return Boolean(
    token &&
    quote.expiresAt &&
    quote.expiresAt > now &&
    quote.capabilityHash === hashQuoteToken(token),
  );
}

export async function getCheckoutQuote(token: string | undefined, checkoutSession?: string | null) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return null;
  }
  const draft = await prisma.checkoutDraft.findUnique({
    where: {
      capabilityHash: hashQuoteToken(token),
      expiresAt: { gt: new Date() },
      ...(checkoutSession
        ? {
            OR: [
              { status: "ISSUED" },
              {
                status: "CHECKED_OUT",
                order: {
                  commerceStatus: "RESERVATION_EXPIRED",
                  checkoutSessionHash: createHash("sha256").update(checkoutSession).digest("hex"),
                },
              },
            ],
          }
        : { status: "ISSUED" }),
    },
    select: {
      id: true,
      expiresAt: true,
      version: true,
      lines: {
        select: {
          perfumeVariantId: true,
          quantity: true,
          quotedPriceMinor: true,
          variant: {
            select: {
              sizeValue: true,
              quantity: true,
              perfume: { select: { name: true, status: true } },
            },
          },
        },
      },
    },
  });
  if (!draft?.expiresAt || !draft.lines.length) {
    return null;
  }
  return {
    storageId: draft.id,
    expiresAt: draft.expiresAt,
    version: draft.version,
    lines: draft.lines.map((line) => {
      if (line.quotedPriceMinor === null) {
        throw new Error("Issued checkout draft has a missing price.");
      }
      return {
        perfumeVariantId: line.perfumeVariantId,
        quantity: line.quantity,
        unitPriceMinor: line.quotedPriceMinor,
        name: line.variant.perfume.name,
        sizeLabel: `${line.variant.sizeValue.toString()} mL`,
        available:
          line.variant.perfume.status === "PUBLISHED" && line.variant.quantity >= line.quantity,
      };
    }),
  };
}

export async function lockIssuedCheckoutQuote(
  tx: Prisma.TransactionClient,
  token: string,
  version: number,
) {
  const capabilityHash = hashQuoteToken(token);
  const draft = await tx.checkoutDraft.findUnique({
    where: { capabilityHash },
    select: { id: true },
  });
  if (!draft || !(await lockCheckoutDraft(tx, draft.id))) {
    return null;
  }
  return tx.checkoutDraft.findUnique({
    where: {
      id: draft.id,
      capabilityHash,
      version,
      status: "ISSUED",
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      lines: { select: { perfumeVariantId: true, quantity: true, quotedPriceMinor: true } },
    },
  });
}

export async function completeCheckoutQuote(
  tx: Prisma.TransactionClient,
  draftId: string,
  orderId: string,
) {
  await tx.checkoutDraft.update({
    where: { id: draftId },
    data: { orderId, status: "CHECKED_OUT" },
  });
}
