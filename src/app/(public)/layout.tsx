import type { ReactNode } from "react";

import { PublicShell } from "@/components/shared/public/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
