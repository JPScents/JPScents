import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    customer: {
      findFirst: mocks.findFirst,
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}));

import { CustomerIdentityConflict, resolveCustomerForOrder } from "@/features/customers";
import { removeCustomer, saveCustomer } from "@/features/customers/services/customer.service";

const input = {
  name: "Ada Okafor",
  whatsappNumber: "2348031234567",
  email: "ada@example.com",
  deliveryState: "Lagos",
  deliveryCity: "Ikeja",
  deliveryAddress: "1 Example Street",
};

describe("customers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a customer when neither checkout identifier exists", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "customer-1" });

    await expect(resolveCustomerForOrder({ customer: mocks } as never, input)).resolves.toEqual({
      id: "customer-1",
    });
    expect(mocks.create).toHaveBeenCalledWith({ data: input });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("reuses and updates the WhatsApp-matched customer without creating a duplicate", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({ id: "customer-1", email: "old@example.com" })
      .mockResolvedValueOnce(null);
    mocks.update.mockResolvedValue({ id: "customer-1" });

    await expect(resolveCustomerForOrder({ customer: mocks } as never, input)).resolves.toEqual({
      id: "customer-1",
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: {
        name: input.name,
        email: input.email,
        deliveryState: input.deliveryState,
        deliveryCity: input.deliveryCity,
        deliveryAddress: input.deliveryAddress,
      },
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("retains an existing email when checkout omits it", async () => {
    const checkoutWithoutEmail = { ...input, email: undefined };
    mocks.findUnique.mockResolvedValue({ id: "customer-1", email: "saved@example.com" });
    mocks.update.mockResolvedValue({ id: "customer-1" });

    await resolveCustomerForOrder({ customer: mocks } as never, checkoutWithoutEmail);

    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "saved@example.com" }),
      }),
    );
  });

  it("rejects checkout when WhatsApp and email resolve to different customers", async () => {
    mocks.findUnique
      .mockResolvedValueOnce({ id: "customer-1", whatsappNumber: input.whatsappNumber })
      .mockResolvedValueOnce({ id: "customer-2", whatsappNumber: "2348099999999" });

    await expect(
      resolveCustomerForOrder({ customer: mocks } as never, input),
    ).rejects.toBeInstanceOf(CustomerIdentityConflict);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects checkout when an email belongs to a customer with another WhatsApp number", async () => {
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "customer-2", whatsappNumber: "2348099999999" });

    await expect(
      resolveCustomerForOrder({ customer: mocks } as never, input),
    ).rejects.toBeInstanceOf(CustomerIdentityConflict);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("does not allow a customer with order history to be deleted", async () => {
    mocks.findUnique.mockResolvedValue({ id: "customer-1", _count: { orders: 1 } });

    await expect(removeCustomer("customer-1")).resolves.toEqual({
      error: "Customers with order history cannot be deleted.",
    });
    expect(mocks.delete).not.toHaveBeenCalled();
  });

  it("allows deletion only for an orderless customer", async () => {
    mocks.findUnique.mockResolvedValue({ id: "customer-1", _count: { orders: 0 } });

    await expect(removeCustomer("customer-1")).resolves.toEqual({ ok: true });
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: "customer-1" } });
  });

  it("reports existing contact identifiers instead of overwriting another customer", async () => {
    mocks.findFirst.mockResolvedValue({ id: "customer-2" });

    await expect(saveCustomer("customer-1", input)).resolves.toEqual({
      errors: { form: "That WhatsApp number or email already belongs to another customer." },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
