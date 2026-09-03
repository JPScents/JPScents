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
vi.mock("@/features/orders/orders", () => ({
  createOrder: mocks.createOrder,
  updateOrderStatus: mocks.updateOrderStatus,
  cancelOrder: mocks.cancelOrder,
}));
import { changeOrderStatus } from "@/features/orders/actions/change-order-status.admin.action";
import { cancelOrderAdmin } from "@/features/orders/actions/cancel-order.admin.action";
import { submitOrder } from "@/features/orders/actions/submit-order.action";

describe("order server actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects unauthorised status writes", async () => {
    mocks.getCurrentAdmin.mockResolvedValue(null);
    await expect(changeOrderStatus("JP-1", "CONFIRMED")).resolves.toEqual({
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
});
