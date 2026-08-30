import { Checkout } from "@/components/checkout/Checkout";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CheckoutPage() {
  return <Checkout />;
}
