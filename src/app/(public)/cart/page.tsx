import { CartPageContent } from "./_components/CartPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CartPage() {
  return <CartPageContent />;
}
