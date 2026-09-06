import { AdminOrderDetail } from "@/features/orders/client";
import { getOrderByReference } from "@/features/orders/server";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return <AdminOrderDetail order={await getOrderByReference((await params).reference)} />;
}
