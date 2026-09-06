import { notFound } from "next/navigation";

import { CustomerEditor } from "@/features/customers/client";
import { getCustomerById } from "@/features/customers/server";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerById((await params).id);
  if (!customer) {
    notFound();
  }
  return <CustomerEditor customer={customer} />;
}
