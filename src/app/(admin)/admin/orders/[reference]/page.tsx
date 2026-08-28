import { AdminOrderDetail, getOrderByReference } from "@/features/orders";
export default async function AdminOrderPage({ params }: { params: Promise<{ reference: string }> }) { return <AdminOrderDetail order={await getOrderByReference((await params).reference)} />; }
