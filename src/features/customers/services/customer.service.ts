import "server-only";

import { Prisma } from "@/db/generated/client";

import {
  createCustomer,
  deleteCustomerRecord,
  findCustomerContactConflict,
  findCustomerForDeletion,
  findCustomerRecord,
  findCustomersForCheckout,
  listCustomerRecords,
  saveCustomerRecord,
  updateCustomerForCheckout,
  type CustomerTransaction,
} from "../repositories/customer.repository";
import type { CustomerInput } from "../types";

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
  )
    throw new CustomerIdentityConflict();
  const customer = customerByWhatsapp ?? customerByEmail;
  if (!customer) return createCustomer(tx, input);
  return updateCustomerForCheckout(tx, customer.id, input, customer.email);
}

export function listCustomers(query?: string) {
  return listCustomerRecords(query);
}

export function getCustomerById(id: string) {
  return findCustomerRecord(id);
}

export async function saveCustomer(id: string | undefined, input: CustomerInput) {
  if (await findCustomerContactConflict(id, input))
    return {
      errors: {
        form: "That WhatsApp number or email already belongs to another customer.",
      },
    } as const;
  try {
    return { customer: await saveCustomerRecord(id, input) } as const;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return {
        errors: {
          form: "That WhatsApp number or email already belongs to another customer.",
        },
      } as const;
    return { errors: { form: "Unable to save this customer." } } as const;
  }
}

export async function removeCustomer(id: string) {
  const customer = await findCustomerForDeletion(id);
  if (!customer) return { error: "Customer not found." } as const;
  if (customer._count.orders)
    return { error: "Customers with order history cannot be deleted." } as const;
  try {
    await deleteCustomerRecord(id);
    return { ok: true } as const;
  } catch {
    return { error: "Unable to delete this customer." } as const;
  }
}
