import { notFound } from "next/navigation";

import { CustomerEditor, getCustomerById } from "@/features/customers";

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomerById((await params).id);
  if (!customer) notFound();
  return <CustomerEditor customer={customer} />;
}
