import type { ReactNode } from "react";

import { PublicShell } from "./_components/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
