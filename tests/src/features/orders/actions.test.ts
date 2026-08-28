import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookies: { set: vi.fn(), get: vi.fn() }, getCurrentAdmin: vi.fn(), createOrder: vi.fn(), updateOrderStatus: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn(async () => mocks.cookies) }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/auth/admin", () => ({ getCurrentAdmin: mocks.getCurrentAdmin }));
vi.mock("@/features/orders/orders", () => ({ createOrder: mocks.createOrder, updateOrderStatus: mocks.updateOrderStatus }));
import { changeOrderStatus, submitOrder } from "@/features/orders/actions";

describe("order server actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects unauthorised status writes", async () => { mocks.getCurrentAdmin.mockResolvedValue(null); await expect(changeOrderStatus("JP-1", "CONFIRMED")).resolves.toEqual({ error: "You are not authorized." }); expect(mocks.updateOrderStatus).not.toHaveBeenCalled(); });
  it("sets secure 24-hour confirmation access without returning its token", async () => { mocks.createOrder.mockResolvedValue({ order: { reference: "JP-1" }, confirmationToken: "secret", duplicate: false }); await expect(submitOrder([], {}, "key")).resolves.toEqual({ order: { reference: "JP-1" }, duplicate: false }); expect(mocks.cookies.set).toHaveBeenCalledWith("jpscents.order-confirmation", "secret", expect.objectContaining({ httpOnly: true, sameSite: "lax", maxAge: 86400, path: "/checkout/confirm" })); });
});
