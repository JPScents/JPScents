import { getCurrentAdmin } from "@/app/_server/admin-session";
import { getAdminCommerceOrder, getOrderByReference } from "@/modules/orders/server";

import { AdminCommerceOrder } from "../_components/AdminCommerceOrder";
import { AdminOrderDetail } from "../_components/AdminOrderDetail";

export default async function AdminOrderPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  const admin = await getCurrentAdmin();
  const commerceOrder = await getAdminCommerceOrder(admin, reference);
  return commerceOrder ? (
    <AdminCommerceOrder order={commerceOrder} />
  ) : (
    <AdminOrderDetail order={await getOrderByReference(admin, reference)} />
  );
}
