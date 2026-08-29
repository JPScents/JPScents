"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { ModalShell } from "@/components/shared/ModalShell";
import { setBestseller } from "../../actions/bestseller.admin.action";

type Candidate = { id: string; name: string; scentCharacters: string[]; primaryImageUrl?: string; variantCount: number; totalQuantity: number; orderCount: number };

export function BestsellerSelector({ candidates, currentId }: { candidates: Candidate[]; currentId?: string }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [message, setMessage] = useState(""); const [pending, startTransition] = useTransition();
  const results = candidates.filter((candidate) => `${candidate.name} ${candidate.scentCharacters.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()));
  const choose = (id: string | null) => startTransition(async () => { const result = await setBestseller(id); if (result.error) { setMessage(result.error); return; } setMessage("Bestseller updated."); setOpen(false); });
  if (!candidates.length) return <p className="text-sm leading-6 text-jp-text-secondary">Add and publish an in-stock perfume before choosing a Bestseller.</p>;
  return <ModalShell open={open} onOpenChange={setOpen} title="Choose Bestseller" description="Only published perfumes with positive stock are eligible." trigger={<button type="button" className="border px-4 py-2 text-sm">Choose Bestseller</button>}>
    <label className="grid gap-1 text-sm font-medium" htmlFor="bestseller-search">Search eligible perfumes<input id="bestseller-search" autoFocus value={query} onChange={(event) => setQuery(event.target.value)} className="h-10 border bg-white px-3" placeholder="Search by name or scent character" /></label>
    <div className="mt-4 divide-y border" aria-live="polite">{results.length ? results.map((candidate) => <button key={candidate.id} type="button" onClick={() => choose(candidate.id)} disabled={pending} aria-pressed={candidate.id === currentId} className="grid w-full grid-cols-[3rem_1fr_auto] gap-3 p-3 text-left hover:bg-jp-stone focus-visible:outline-2 focus-visible:outline-offset-[-2px]"><span className="flex h-12 w-10 items-center justify-center bg-jp-stone text-center text-[10px] text-jp-text-secondary">{candidate.primaryImageUrl ? <Image unoptimized src={candidate.primaryImageUrl} alt="" width={80} height={96} className="h-full w-full object-contain" /> : "No image"}</span><span><span className="block font-display text-xl">{candidate.name}</span><span className="block text-xs text-jp-text-secondary">{candidate.scentCharacters.join(" · ")}</span><span className="mt-1 block text-xs text-jp-text-secondary">{candidate.variantCount} variants · {candidate.totalQuantity} units · {candidate.orderCount} orders</span></span><span className="self-center text-xs font-semibold">{candidate.id === currentId ? "Current" : "Select"}</span></button>) : <p className="p-5 text-sm text-jp-text-secondary">No eligible perfumes match this search.</p>}</div>
    <button type="button" disabled={pending} onClick={() => choose(null)} className="mt-4 text-sm underline">Clear Bestseller</button>{message ? <p className="mt-3 text-sm" role="status">{message}</p> : null}
  </ModalShell>;
}
