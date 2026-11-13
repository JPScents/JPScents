import type { ReactNode } from "react";

import { isCommerceCheckoutActive } from "@/infrastructure/paystack/client";

import { PublicShell } from "./_components/PublicShell";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <PublicShell onlineCheckout={isCommerceCheckoutActive()}>{children}</PublicShell>;
}
