import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/shared/admin/AdminShell";
import { siteConfig } from "@/config/site";
import { getCurrentAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(siteConfig.routes.adminLogin);
  return <AdminShell email={admin.email}>{children}</AdminShell>;
}
