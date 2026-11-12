import { CustomerList } from "@/features/customers/client";
import { listCustomers } from "@/features/customers/server";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;
  return <CustomerList customers={await listCustomers(query)} query={query} />;
}
