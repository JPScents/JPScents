import { Checkout } from "./_components/Checkout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CheckoutPage() {
  return <Checkout />;
}
