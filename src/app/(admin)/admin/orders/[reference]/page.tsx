import { getCurrentAdmin } from "@/app/_server/admin-session";
import { AdminOrderDetail } from "@/app/(admin)/admin/orders/_components/AdminOrderDetail";
import { getOrderByReference } from "@/modules/orders/server";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  return (
    <AdminOrderDetail
      order={await getOrderByReference(await getCurrentAdmin(), (await params).reference)}
    />
  );
}
