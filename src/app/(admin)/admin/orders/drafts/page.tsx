import Link from "next/link";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { listCheckoutDrafts } from "@/modules/orders/server";
import { formatEnumLabel } from "@/shared/utils/format-enum-label";

export default async function CheckoutDraftsPage() {
  const drafts = await listCheckoutDrafts(await getCurrentAdmin());
  return (
    <main className="px-5 py-7 lg:px-admin-content lg:py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-4xl">Checkout drafts</h1>
        <Link
          className="border bg-jp-surface px-4 py-2 text-sm underline"
          href="/admin/orders/drafts/new"
        >
          New draft
        </Link>
      </div>
      {drafts.length ? (
        <ul className="mt-5 divide-y border-y">
          {drafts.map((draft) => (
            <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <Link className="underline" href={`/admin/orders/drafts/${draft.id}`}>
                {draft.contactName ?? "Guest draft"}
              </Link>
              <span className="text-sm">{draft._count.lines} items</span>
              <span className="text-sm">{formatEnumLabel(draft.status)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4" role="status">
          No checkout drafts yet.
        </p>
      )}
    </main>
  );
}
