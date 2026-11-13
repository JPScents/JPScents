import { notFound } from "next/navigation";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { getAdminCheckoutDraft } from "@/modules/orders/server";

import { CheckoutDraftEditor } from "../_components/CheckoutDraftEditor";

export default async function EditCheckoutDraftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    notFound();
  }
  const draft = await getAdminCheckoutDraft(await getCurrentAdmin(), id);
  if (!draft) {
    notFound();
  }
  return (
    <main className="px-5 py-7 lg:px-admin-content lg:py-10">
      <h1 className="font-display text-4xl">Checkout draft</h1>
      <CheckoutDraftEditor
        draft={{
          ...draft,
          lines: draft.lines.map(({ perfumeVariantId, quotedPriceMinor, ...line }) => ({
            ...line,
            id: perfumeVariantId,
            lockedPrice: quotedPriceMinor,
          })),
        }}
      />
    </main>
  );
}
