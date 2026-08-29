import {
  BestsellerSelector,
  getCatalogueAdminOverview,
  getEligibleBestsellerCandidates,
} from "@/features/catalogue";
import { AdminOverview } from "@/components/admin-overview/AdminOverview";
import { getOrdersAdminOverview } from "@/features/orders";

export default async function AdminPage() {
  const [ordersOverview, catalogueOverview, candidates] = await Promise.all([
    getOrdersAdminOverview(),
    getCatalogueAdminOverview(),
    getEligibleBestsellerCandidates(),
  ]);
  const overview = { ...ordersOverview, ...catalogueOverview };
  return (
    <AdminOverview
      overview={overview}
      bestseller={
        <BestsellerSelector candidates={candidates} currentId={overview.bestseller?.id} />
      }
    />
  );
}
