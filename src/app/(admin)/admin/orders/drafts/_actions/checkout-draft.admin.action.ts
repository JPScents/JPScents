"use server";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { getPaystackReturnOrigin } from "@/infrastructure/paystack/client";
import {
  issueCheckoutDraft,
  parseCheckoutDraft,
  parseCheckoutDraftRevision,
  revokeCheckoutDraft,
  saveCheckoutDraft,
} from "@/modules/orders/server";

export async function saveDraft(value: unknown) {
  const admin = await getCurrentAdmin();
  const parsed = parseCheckoutDraft(value);
  if (!admin || !parsed) {
    return { error: "The draft could not be saved. Check its fields and your access." } as const;
  }
  try {
    const saved = await saveCheckoutDraft(admin, parsed.input, parsed.existing);
    if ("id" in saved) {
      revalidatePath("/admin/orders/drafts");
    }
    return saved;
  } catch {
    console.error("[orders] Draft save failed.");
    return { error: "The draft could not be saved." } as const;
  }
}

export async function issueDraftLink(value: unknown) {
  const admin = await getCurrentAdmin();
  const revision = parseCheckoutDraftRevision(value);
  const origin = getPaystackReturnOrigin();
  if (!admin || !revision || !origin) {
    return { error: "Checkout links are unavailable in this environment." } as const;
  }
  try {
    const issued = await issueCheckoutDraft(admin, revision.id, revision.version);
    if ("error" in issued) {
      return issued;
    }
    revalidatePath("/admin/orders/drafts");
    return {
      url: `${origin}/checkout/quote/access#${issued.token}`,
      expiresAt: issued.expiresAt.toISOString(),
    } as const;
  } catch {
    console.error("[orders] Draft link issue failed.");
    return { error: "The checkout link could not be issued." } as const;
  }
}

export async function revokeDraftLink(value: unknown) {
  const admin = await getCurrentAdmin();
  const revision = parseCheckoutDraftRevision(value);
  if (!admin || !revision) {
    return { error: "This checkout link could not be revoked." } as const;
  }
  try {
    const result = await revokeCheckoutDraft(admin, revision.id, revision.version);
    revalidatePath("/admin/orders/drafts");
    return result;
  } catch {
    console.error("[orders] Draft link revocation failed.");
    return { error: "The checkout link could not be revoked." } as const;
  }
}
