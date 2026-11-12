import "server-only";

import { Prisma } from "@/db/generated/client";
import { prisma } from "@/db/prisma";

import type { CustomerInput } from "../types";

export type CustomerTransaction = Pick<Prisma.TransactionClient, "customer">;

async function findCustomersForCheckout(tx: CustomerTransaction, input: CustomerInput) {
  const [customerByWhatsapp, customerByEmail] = await Promise.all([
    tx.customer.findUnique({ where: { whatsappNumber: input.whatsappNumber } }),
    input.email ? tx.customer.findUnique({ where: { email: input.email } }) : null,
  ]);
  return { customerByWhatsapp, customerByEmail };
}

const cleanQuery = (value: string | undefined) => value?.trim().slice(0, 120) ?? "";

export async function listCustomerRecords(query?: string) {
  const value = cleanQuery(query);
  return await prisma.customer.findMany({
    where: value
      ? {
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { whatsappNumber: { contains: value } },
            { email: { contains: value, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      email: true,
      _count: { select: { orders: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function findCustomerRecord(id: string) {
  return await prisma.customer.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      whatsappNumber: true,
      email: true,
      deliveryState: true,
      deliveryCity: true,
      deliveryAddress: true,
      orders: {
        select: {
          reference: true,
          status: true,
          subtotalMinor: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

async function findCustomerContactConflict(id: string | undefined, input: CustomerInput) {
  return await prisma.customer.findFirst({
    where: {
      OR: [
        { whatsappNumber: input.whatsappNumber },
        ...(input.email ? [{ email: input.email }] : []),
      ],
      ...(id ? { id: { not: id } } : {}),
    },
  });
}

export class CustomerIdentityConflict extends Error {
  constructor() {
    super(
      "The WhatsApp number and email belong to different customers. Review the customer record before placing this order.",
    );
  }
}

export async function resolveCustomerForOrder(tx: CustomerTransaction, input: CustomerInput) {
  const { customerByWhatsapp, customerByEmail } = await findCustomersForCheckout(tx, input);
  if (
    (customerByWhatsapp && customerByEmail && customerByWhatsapp.id !== customerByEmail.id) ||
    (!customerByWhatsapp &&
      customerByEmail &&
      customerByEmail.whatsappNumber !== input.whatsappNumber)
  ) {
    throw new CustomerIdentityConflict();
  }
  const customer = customerByWhatsapp ?? customerByEmail;
  if (!customer) {
    return await tx.customer.create({ data: input });
  }
  return await tx.customer.update({
    where: { id: customer.id },
    data: {
      name: input.name,
      email: input.email ?? customer.email,
      deliveryState: input.deliveryState,
      deliveryCity: input.deliveryCity,
      deliveryAddress: input.deliveryAddress,
    },
  });
}

export async function saveCustomer(id: string | undefined, input: CustomerInput) {
  if (await findCustomerContactConflict(id, input)) {
    return {
      errors: {
        form: "That WhatsApp number or email already belongs to another customer.",
      },
    } as const;
  }
  try {
    return {
      customer: await (id
        ? prisma.customer.update({ where: { id }, data: input })
        : prisma.customer.create({ data: input })),
    } as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        errors: {
          form: "That WhatsApp number or email already belongs to another customer.",
        },
      } as const;
    }
    console.error("[customers] save failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { errors: { form: "Unable to save this customer." } } as const;
  }
}

export async function removeCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    select: { _count: { select: { orders: true } } },
  });
  if (!customer) {
    return { error: "Customer not found." } as const;
  }
  if (customer._count.orders) {
    return { error: "Customers with order history cannot be deleted." } as const;
  }
  try {
    await prisma.customer.delete({ where: { id } });
    return { ok: true } as const;
  } catch (error) {
    console.error("[customers] delete failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { error: "Unable to delete this customer." } as const;
  }
}
