import { Confirmation, getOrderConfirmation, readConfirmationCookie } from "@/features/orders";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default async function ConfirmationPage() {
  return (
    <Confirmation
      order={await getOrderConfirmation(await readConfirmationCookie())}
      businessNumber={process.env.JP_SCENTS_WHATSAPP_NUMBER}
    />
  );
}
