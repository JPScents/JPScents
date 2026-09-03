import { CustomerList, listCustomers } from "@/features/customers";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;
  return <CustomerList customers={await listCustomers(query)} query={query} />;
}
