import type { Metadata } from "next";

import { OpenCheckoutLink } from "../../_components/OpenCheckoutLink";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function StatusLinkPage() {
  return <OpenCheckoutLink />;
}
