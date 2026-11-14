import { getCurrentAdmin } from "@/app/_server/admin-session";
import { CustomerList } from "./_components/CustomerList";
import { listCustomers } from "@/modules/customers/server";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const { query } = await searchParams;
  return (
    <CustomerList customers={await listCustomers(await getCurrentAdmin(), query)} query={query} />
  );
}
