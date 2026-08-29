import { notFound } from "next/navigation";
import { PerfumeEditor, getAdminPerfume } from "@/features/catalogue";
export default async function EditPerfumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const perfume = await getAdminPerfume(id);
  if (!perfume) notFound();
  return <PerfumeEditor perfume={perfume} />;
}
