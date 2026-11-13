import { getCurrentAdmin } from "@/app/_server/admin-session";
import { AdminOrders } from "./_components/AdminOrders";
import { listOrders } from "@/modules/orders/server";
import { orderStatuses } from "@/modules/orders";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = orderStatuses.find((value) => value === params.status);
  const query = typeof params.query === "string" ? params.query : undefined;
  return (
    <AdminOrders
      orders={await listOrders(await getCurrentAdmin(), { query, status })}
      query={query}
      status={status}
    />
  );
}
