"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { findDraftVariants } from "../_actions/search-draft-variants.admin.action";
import {
  issueDraftLink,
  revokeDraftLink,
  saveDraft,
} from "../_actions/checkout-draft.admin.action";

export type DraftVariant = {
  id: string;
  name: string;
  size: string;
  priceMinor: number;
  available: number;
};
type Line = DraftVariant & { quantity: number; lockedPrice?: number | null };
type Draft = {
  id: string;
  version: number;
  status: string;
  contactName: string | null;
  contactEmail: string | null;
  expiresAt: Date | null;
  lines: Line[];
};

export function CheckoutDraftEditor({ draft }: { draft?: Draft }) {
  const [query, setQuery] = useState("");
  const [variants, setVariants] = useState<DraftVariant[]>([]);
  const [searchPending, search] = useTransition();
  const router = useRouter();
  const [lines, setLines] = useState(draft?.lines ?? []);
  const [name, setName] = useState(draft?.contactName ?? "");
  const [email, setEmail] = useState(draft?.contactEmail ?? "");
  const [variantId, setVariantId] = useState("");
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [link, setLink] = useState<{ url: string; expiresAt: string }>();
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const done = draft?.status === "CHECKED_OUT";

  function searchProducts(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    search(async () => {
      try {
        setVariants(await findDraftVariants(query));
        setVariantId("");
      } catch {
        setMessage({ text: "Could not load products. Try again.", error: true });
      }
    });
  }

  function addLine() {
    const variant = variants.find((item) => item.id === variantId);
    if (!variant || lines.some((item) => item.id === variantId)) {
      return;
    }
    setLines([...lines, { ...variant, quantity: 1 }]);
    setDirty(true);
    setVariantId("");
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start(async () => {
      setMessage(undefined);
      const result = await saveDraft({
        id: draft?.id,
        version: draft?.version,
        contactName: name,
        contactEmail: email,
        lines: lines.map(({ id, quantity }) => ({ perfumeVariantId: id, quantity })),
      });
      if ("error" in result && result.error) {
        setMessage({ text: result.error, error: true });
      } else if ("id" in result) {
        setLink(undefined);
        setDirty(false);
        setMessage({ text: "Draft saved." });
        router.replace(`/admin/orders/drafts/${result.id}`);
        router.refresh();
      }
    });
  }

  function issue() {
    if (!draft || dirty) {
      return;
    }
    start(async () => {
      setMessage(undefined);
      const result = await issueDraftLink({
        id: draft.id,
        version: draft.version,
        prices: draft.lines.map(({ id, priceMinor }) => ({ id, priceMinor })),
      });
      if ("error" in result && result.error) {
        setMessage({ text: result.error, error: true });
        if ("stalePrices" in result) {
          router.refresh();
        }
      } else if ("url" in result && result.url) {
        setLink({ url: result.url, expiresAt: result.expiresAt });
        setMessage({ text: "Checkout link issued for 24 hours." });
        router.refresh();
      }
    });
  }

  function revoke() {
    if (!draft) {
      return;
    }
    start(async () => {
      const result = await revokeDraftLink({ id: draft.id, version: draft.version });
      if ("error" in result && result.error) {
        setMessage({ text: result.error, error: true });
      } else {
        setLink(undefined);
        setMessage({ text: "Checkout link revoked." });
        router.refresh();
      }
    });
  }

  return (
    <div className="mt-6 max-w-3xl space-y-5">
      <form className="flex flex-wrap items-end gap-2" onSubmit={searchProducts}>
        <label className="grid gap-1 text-sm font-medium">
          Search products
          <input
            name="q"
            value={query}
            maxLength={80}
            disabled={searchPending}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 border bg-jp-surface px-3"
          />
        </label>
        <button className="h-10 border px-4 text-sm" disabled={searchPending} type="submit">
          {searchPending ? "Searching…" : "Search"}
        </button>
      </form>
      <form onSubmit={save}>
        <fieldset disabled={pending || done} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">
              Contact name
              <input
                maxLength={120}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setDirty(true);
                }}
                className="h-10 border px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium">
              Contact email
              <input
                type="email"
                maxLength={254}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setDirty(true);
                }}
                className="h-10 border px-3"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="grid gap-1 text-sm font-medium">
              Variant
              <select
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                className="h-10 border px-2"
              >
                <option value="">Choose a variant</option>
                {variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} {variant.size} mL · {formatNairaFromMinor(variant.priceMinor)}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="h-10 border px-4 text-sm"
              disabled={!variantId}
              type="button"
              onClick={addLine}
            >
              Add variant
            </button>
          </div>
          <ul className="divide-y border-y">
            {lines.map((line) => {
              const saved = draft?.lines.find((item) => item.id === line.id);
              const priceMinor = saved?.priceMinor ?? line.priceMinor;
              const lockedPrice = saved ? saved.lockedPrice : line.lockedPrice;
              return (
                <li key={line.id} className="flex flex-wrap items-center gap-3 py-3">
                  <span className="flex-1">
                    {line.name} {line.size} mL
                  </span>
                  <span className="text-sm">Current {formatNairaFromMinor(priceMinor)}</span>
                  {lockedPrice != null ? (
                    <span className="text-sm">Quoted {formatNairaFromMinor(lockedPrice)}</span>
                  ) : null}
                  <label className="text-sm">
                    Quantity{" "}
                    <input
                      type="number"
                      min={1}
                      max={99}
                      required
                      className="h-9 w-16 border px-2"
                      value={line.quantity || ""}
                      onChange={(event) => {
                        setLines(
                          lines.map((item) =>
                            item.id === line.id
                              ? { ...item, quantity: Number(event.target.value) }
                              : item,
                          ),
                        );
                        setDirty(true);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-sm underline"
                    onClick={() => {
                      setLines(lines.filter((item) => item.id !== line.id));
                      setDirty(true);
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
          <button className="border bg-jp-olive px-4 py-2 text-sm text-white" type="submit">
            Save draft
          </button>
        </fieldset>
      </form>
      {draft && !done ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="border px-4 py-2 text-sm"
            disabled={pending || dirty || !lines.length}
            onClick={issue}
          >
            {draft.status === "ISSUED" ? "Reissue at current prices" : "Issue checkout link"}
          </button>
          {draft.status === "ISSUED" ? (
            <button
              type="button"
              className="border px-4 py-2 text-sm"
              disabled={pending}
              onClick={revoke}
            >
              Revoke checkout link
            </button>
          ) : null}
        </div>
      ) : null}
      {link ? (
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid flex-1 gap-1 text-sm">
            Checkout link
            <input readOnly value={link.url} className="h-10 border px-3" />
          </label>
          <button
            type="button"
            className="h-10 border px-3 text-sm"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link.url);
                setMessage({ text: "Checkout link copied." });
              } catch {
                setMessage({ text: "Select the link and copy it manually.", error: true });
              }
            }}
          >
            Copy link
          </button>
        </div>
      ) : null}
      {message ? (
        <p role={message.error ? "alert" : "status"} className="text-sm">
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
