import "server-only";

import { Prisma } from "@/db/generated/client";
import { prisma } from "@/db/prisma";

import type { CustomerInput } from "../types";

export type CustomerTransaction = Pick<Prisma.TransactionClient, "customer">;

export async function findCustomersForCheckout(tx: CustomerTransaction, input: CustomerInput) {
  const [customerByWhatsapp, customerByEmail] = await Promise.all([
    tx.customer.findUnique({ where: { whatsappNumber: input.whatsappNumber } }),
    input.email ? tx.customer.findUnique({ where: { email: input.email } }) : null,
  ]);
  return { customerByWhatsapp, customerByEmail };
}

export function createCustomer(tx: CustomerTransaction, input: CustomerInput) {
  return tx.customer.create({ data: input });
}

export function updateCustomerForCheckout(
  tx: CustomerTransaction,
  customerId: string,
  input: CustomerInput,
  existingEmail: string | null,
) {
  return tx.customer.update({
    where: { id: customerId },
    data: {
      name: input.name,
      email: input.email ?? existingEmail,
      deliveryState: input.deliveryState,
      deliveryCity: input.deliveryCity,
      deliveryAddress: input.deliveryAddress,
    },
  });
}

const cleanQuery = (value: string | undefined) => value?.trim().slice(0, 120) ?? "";

export function listCustomerRecords(query?: string) {
  const value = cleanQuery(query);
  return prisma.customer.findMany({
    where: value
      ? {
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { whatsappNumber: { contains: value } },
            { email: { contains: value, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { orders: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export function findCustomerRecord(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export function findCustomerContactConflict(id: string | undefined, input: CustomerInput) {
  return prisma.customer.findFirst({
    where: {
      OR: [
        { whatsappNumber: input.whatsappNumber },
        ...(input.email ? [{ email: input.email }] : []),
      ],
      ...(id ? { id: { not: id } } : {}),
    },
  });
}

export function saveCustomerRecord(id: string | undefined, input: CustomerInput) {
  return id
    ? prisma.customer.update({ where: { id }, data: input })
    : prisma.customer.create({ data: input });
}

export function findCustomerForDeletion(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
}

export function deleteCustomerRecord(id: string) {
  return prisma.customer.delete({ where: { id } });
}
