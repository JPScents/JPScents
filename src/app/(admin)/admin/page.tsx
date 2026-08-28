import { BestsellerSelector, getEligibleBestsellerCandidates } from "@/features/catalogue";
import { AdminOverview, getAdminOverview } from "@/features/orders";

export default async function AdminPage() { const [overview, candidates] = await Promise.all([getAdminOverview(), getEligibleBestsellerCandidates()]); return <AdminOverview overview={overview} bestseller={<BestsellerSelector candidates={candidates} currentId={overview.bestseller?.id} />} />; }
