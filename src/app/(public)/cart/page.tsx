import { FullCart } from "@/features/cart";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CartPage() {
  return <FullCart />;
}
