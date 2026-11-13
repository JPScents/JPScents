import { getCurrentAdmin } from "@/app/_server/admin-session";
import { BestsellerSelector } from "./_components/BestsellerSelector";
import {
  getCatalogueAdminOverview,
  getEligibleBestsellerCandidates,
} from "@/modules/catalogue/server";
import { AdminOverview } from "./_components/AdminOverview";
import { getOrdersAdminOverview } from "@/modules/orders/server";

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  const [ordersOverview, catalogueOverview, candidates] = await Promise.all([
    getOrdersAdminOverview(admin),
    getCatalogueAdminOverview(admin),
    getEligibleBestsellerCandidates(admin),
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
