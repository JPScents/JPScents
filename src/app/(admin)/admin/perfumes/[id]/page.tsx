import { getCurrentAdmin } from "@/app/_server/admin-session";
import { notFound } from "next/navigation";
import { PerfumeEditor } from "@/app/(admin)/admin/perfumes/_components/PerfumeEditor";
import { getAdminPerfume } from "@/modules/catalogue/server";

export default async function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfume = await getAdminPerfume(await getCurrentAdmin(), id);
  if (!perfume) {
    notFound();
  }
  return <PerfumeEditor perfume={perfume} />;
}
