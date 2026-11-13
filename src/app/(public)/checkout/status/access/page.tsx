import type { Metadata } from "next";

import { OpenStatusLink } from "./_components/OpenStatusLink";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function StatusLinkPage() {
  return <OpenStatusLink />;
}
