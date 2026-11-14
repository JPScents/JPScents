import { getCurrentAdmin } from "@/app/_server/admin-session";
import { notFound } from "next/navigation";

import { CustomerEditor } from "@/app/(admin)/admin/customers/_components/CustomerEditor";
import { getCustomerById } from "@/modules/customers/server";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerById(await getCurrentAdmin(), (await params).id);
  if (!customer) {
    notFound();
  }
  return <CustomerEditor customer={customer} />;
}
