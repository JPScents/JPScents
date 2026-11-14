import { getCurrentAdmin } from "@/app/_server/admin-session";
import { orderStatuses } from "@/modules/orders";
import { listAdminCommerceOrders, listOrders } from "@/modules/orders/server";

import { AdminOrders } from "./_components/AdminOrders";
import { CommerceOrdersList } from "./_components/CommerceOrdersList";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = orderStatuses.find((value) => value === params.status);
  const query = typeof params.query === "string" ? params.query : undefined;
  const commerceQuery =
    typeof params.commerceQuery === "string" ? params.commerceQuery.trim().slice(0, 120) : "";
  const commerceStatus =
    typeof params.commerceStatus === "string" ? params.commerceStatus : undefined;
  const fulfilment = typeof params.fulfilment === "string" ? params.fulfilment : undefined;
  const admin = await getCurrentAdmin();
  const [legacy, commerce] = await Promise.all([
    listOrders(admin, { query, status }),
    listAdminCommerceOrders(admin, commerceQuery, commerceStatus, fulfilment),
  ]);
  return (
    <>
      <CommerceOrdersList
        rows={commerce}
        query={commerceQuery}
        status={commerceStatus}
        fulfilment={fulfilment}
      />
      <AdminOrders orders={legacy} query={query} status={status} />
    </>
  );
}
