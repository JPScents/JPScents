import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cookies: { set: vi.fn(), get: vi.fn() },
  getCurrentAdmin: vi.fn(),
  createOrder: vi.fn(),
  updateOrderStatus: vi.fn(),
  cancelOrder: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => mocks.cookies) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/app/_server/admin-session", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock("@/modules/orders/services/order.service", () => ({
  createOrder: mocks.createOrder,
}));
vi.mock("@/modules/orders/repositories/order.repository", () => ({
  updateOrderStatus: mocks.updateOrderStatus,
  cancelOrderAndRestoreStock: mocks.cancelOrder,
}));
import { changeOrderStatus } from "@/app/(admin)/admin/orders/_actions/change-order-status.admin.action";
import { cancelOrderAdmin } from "@/app/(admin)/admin/orders/_actions/cancel-order.admin.action";
import { submitOrder } from "@/app/(public)/checkout/_actions/submit-order.action";
import { readConfirmationCookie } from "@/app/(public)/checkout/_server/confirmation-cookie";

const variantId = "11111111-1111-4111-8111-111111111111";
const submissionKey = "22222222-2222-4222-8222-222222222222";
const cart = [{ perfumeVariantId: variantId, quantity: 1 }];
const checkout = {
  customerName: " Ada ",
  whatsappNumber: "0803 123 4567",
  email: "ADA@EXAMPLE.COM",
  deliveryState: "Lagos",
  deliveryCity: "Ikeja",
  deliveryAddress: "1 Example Street",
};

describe("order server actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects unauthorised status writes", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);
    await expect(changeOrderStatus("JP-1", "PAID")).resolves.toEqual({
      error: "You are not authorized.",
    });
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });
  it("authorizes cancellation before restoring stock and revalidates affected admin pages", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);
    await expect(cancelOrderAdmin("JP-1")).resolves.toEqual({ error: "You are not authorized." });
    expect(mocks.cancelOrder).not.toHaveBeenCalled();

    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin", email: "admin@example.com" });
    mocks.cancelOrder.mockResolvedValue({ ok: true });
    await expect(cancelOrderAdmin("JP-1")).resolves.toEqual({ ok: true });
    expect(mocks.cancelOrder).toHaveBeenCalledWith("JP-1");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders/JP-1");
  });
  it.each([null, 42, {}, "", "   "])("rejects invalid status references: %j", async (reference) => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    await expect(changeOrderStatus(reference, "PAID")).resolves.toEqual({
      error: "Order not found.",
    });
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
  it("rejects invalid and cancellation statuses before repository writes", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    await expect(changeOrderStatus("JP-1", "INVALID")).resolves.toEqual({
      error: "Choose a valid order status.",
    });
    await expect(changeOrderStatus("JP-1", "CANCELLED")).resolves.toEqual({
      error: "Use the cancellation action to cancel an order.",
    });
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });
  it("normalizes status references and only revalidates successful writes", async () => {
    mocks.getCurrentAdmin.mockResolvedValue({ id: "admin" });
    mocks.updateOrderStatus.mockResolvedValueOnce({ error: "Order not found." });
    await changeOrderStatus(" JP-1 ", "PAID");
    expect(mocks.revalidatePath).not.toHaveBeenCalled();

    mocks.updateOrderStatus.mockResolvedValueOnce({ ok: true });
    await changeOrderStatus(" JP-1 ", "PAID");
    expect(mocks.updateOrderStatus).toHaveBeenCalledWith("JP-1", "PAID");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders/JP-1");
  });
  it("rejects invalid carts, including quantities that exceed the limit after merging", async () => {
    for (const lines of [
      null,
      [],
      [
        { perfumeVariantId: variantId, quantity: 60 },
        { perfumeVariantId: variantId, quantity: 60 },
      ],
    ]) {
      await expect(submitOrder(lines, checkout, submissionKey)).resolves.toMatchObject({
        error: expect.stringContaining("cart"),
      });
    }
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.cookies.set).not.toHaveBeenCalled();
  });

  it.each([null, 42, "invalid"])("rejects invalid submission identity %j", async (key) => {
    await expect(submitOrder(cart, checkout, key)).resolves.toMatchObject({
      error: expect.stringContaining("refresh"),
    });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.cookies.set).not.toHaveBeenCalled();
  });

  it("returns field errors and accepts a corrected retry with the same key", async () => {
    await expect(
      submitOrder(cart, { ...checkout, deliveryAddress: "" }, submissionKey),
    ).resolves.toEqual({ errors: { deliveryAddress: "Enter your delivery address." } });
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.cookies.set).not.toHaveBeenCalled();

    mocks.createOrder.mockResolvedValue({
      order: { reference: "JP-1" },
      confirmationToken: "confirmation-fixture",
      duplicate: false,
    });
    await expect(submitOrder([...cart, ...cart], checkout, submissionKey)).resolves.toEqual({
      order: { reference: "JP-1" },
      duplicate: false,
    });
    expect(mocks.createOrder).toHaveBeenCalledExactlyOnceWith(
      [{ perfumeVariantId: variantId, quantity: 2 }],
      {
        ...checkout,
        customerName: "Ada",
        whatsappNumber: "2348031234567",
        email: "ada@example.com",
      },
      submissionKey,
    );
    expect(mocks.cookies.set).toHaveBeenCalledWith(
      "jpscents.order-confirmation",
      "confirmation-fixture",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        maxAge: 86400,
        path: "/checkout/confirm",
      }),
    );
  });
  it("reads confirmation access from the same cookie and leaves it untouched after a failed submission", async () => {
    mocks.cookies.get.mockReturnValue({ value: "confirmation-fixture" });
    await expect(readConfirmationCookie()).resolves.toBe("confirmation-fixture");
    expect(mocks.cookies.get).toHaveBeenCalledWith("jpscents.order-confirmation");

    mocks.createOrder.mockResolvedValue({ error: "Invalid cart." });
    await expect(submitOrder(cart, checkout, submissionKey)).resolves.toEqual({
      error: "Invalid cart.",
    });
    expect(mocks.cookies.set).not.toHaveBeenCalled();
  });
});
