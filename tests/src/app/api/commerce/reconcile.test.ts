import { afterEach, describe, expect, it, vi } from "vitest";

const { run } = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/modules/orders/server", () => ({ reconcileCommerceWork: run }));

import { POST } from "@/app/api/commerce/reconcile/route";

afterEach(() => {
  vi.unstubAllEnvs();
  run.mockReset();
});

describe("protected commerce reconciliation endpoint", () => {
  it("does no work when the deployment secret is absent or wrong", async () => {
    vi.stubEnv("CRON_SECRET", undefined);
    expect((await POST(new Request("https://example.test/api/commerce/reconcile"))).status).toBe(
      401,
    );
    vi.stubEnv("CRON_SECRET", "synthetic-scheduler-fixture");
    expect(
      (
        await POST(
          new Request("https://example.test/api/commerce/reconcile", {
            headers: { authorization: "Bearer different" },
          }),
        )
      ).status,
    ).toBe(401);
    expect(run).not.toHaveBeenCalled();
  });

  it("acknowledges completed work and reports a batch failure without provider data", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-scheduler-fixture");
    run.mockResolvedValueOnce({ expired: 1, payments: 0, refunds: 0, errors: 0 });
    run.mockResolvedValueOnce({ expired: 0, payments: 0, refunds: 0, errors: 1 });
    const request = new Request("https://example.test/api/commerce/reconcile", {
      headers: { authorization: "Bearer synthetic-scheduler-fixture" },
    });
    expect((await POST(request)).status).toBe(200);
    expect((await POST(request)).status).toBe(503);
    expect(run).toHaveBeenCalledWith("SCHEDULED");
  });
});
