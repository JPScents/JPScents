import { AdminOrders } from "@/features/orders";
import { listOrders } from "@/features/orders/server";
import { OrderStatus } from "@/db/generated/client";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status =
    typeof params.status === "string" &&
    Object.values(OrderStatus).includes(params.status as OrderStatus)
      ? (params.status as OrderStatus)
      : undefined;
  const query = typeof params.query === "string" ? params.query : undefined;
  return <AdminOrders orders={await listOrders({ query, status })} query={query} status={status} />;
}
