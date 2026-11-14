import { getCurrentAdmin } from "@/app/_server/admin-session";
import { listDeliverySettings } from "@/modules/delivery/server";

import { DeliverySettingsForm } from "./_components/DeliverySettingsForm";

export default async function AdminDeliveryPage() {
  const settings = await listDeliverySettings(await getCurrentAdmin());

  return (
    <main className="px-5 py-7 lg:px-admin-content lg:py-10">
      <h1 className="font-display text-4xl">Delivery</h1>
      <p className="mt-2 text-sm text-jp-text-secondary">
        Set a delivery fee in NGN for each state you serve.
      </p>
      <DeliverySettingsForm settings={settings} />
    </main>
  );
}
