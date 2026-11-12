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
vi.mock("@/lib/auth/admin", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock("@/features/orders/services/order.service", () => ({
  createOrder: mocks.createOrder,
}));
vi.mock("@/features/orders/repositories/order.repository", () => ({
  updateOrderStatus: mocks.updateOrderStatus,
  cancelOrderAndRestoreStock: mocks.cancelOrder,
}));
import { changeOrderStatus } from "@/features/orders/actions/change-order-status.admin.action";
import { cancelOrderAdmin } from "@/features/orders/actions/cancel-order.admin.action";
import { submitOrder } from "@/features/orders/actions/submit-order.action";
import { readConfirmationCookie } from "@/features/orders/server/confirmation-cookie";

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
  it("sets secure 24-hour confirmation access without returning its token", async () => {
    mocks.createOrder.mockResolvedValue({
      order: { reference: "JP-1" },
      confirmationToken: "secret",
      duplicate: false,
    });
    await expect(submitOrder([], {}, "key")).resolves.toEqual({
      order: { reference: "JP-1" },
      duplicate: false,
    });
    expect(mocks.cookies.set).toHaveBeenCalledWith(
      "jpscents.order-confirmation",
      "secret",
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
    await expect(submitOrder([], {}, "key")).resolves.toEqual({ error: "Invalid cart." });
    expect(mocks.cookies.set).not.toHaveBeenCalled();
  });
});
