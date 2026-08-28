"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ModalShell } from "@/components/shared/ModalShell";
import { formatNairaFromMinor, occasions, parseNairaToMinor, scentCharacters, timesOfDay } from "./fields";
import { savePerfume, type PerfumeActionState } from "./actions/save-perfume.admin.action";
import { PrimaryImageManager } from "./PrimaryImageManager";
import { VariantManager } from "./VariantManager";

type Perfume = NonNullable<Awaited<ReturnType<typeof import("./catalogue").getAdminPerfume>>>;
type StagedVariant = { sizeValue: string; price: string; quantity: string };
const initial: PerfumeActionState = {};
const labels: Record<string, string> = { FRESH: "Fresh", WARM: "Warm", SWEET: "Sweet", WOODY: "Woody", EVERYDAY: "Everyday", WORK: "Work", DATE_NIGHT: "Date night", SPECIAL_OCCASION: "Special occasion", DAY: "Day", NIGHT: "Night" };

function ChoiceGroup({ name, title, options, selected, error, form }: { name: string; title: string; options: readonly string[]; selected: string[]; error?: string; form: string }) {
  return <fieldset aria-describedby={error ? `${name}-error` : undefined}>
    <legend className="text-sm font-medium">{title} <span className="text-jp-text-secondary">Required</span></legend>
    <div className="mt-3 flex flex-wrap gap-2">{options.map((value) => <label key={value} className="flex items-center gap-2 border border-jp-admin-border bg-white px-3 py-2 text-sm"><input form={form} name={name} type="checkbox" value={value} defaultChecked={selected.includes(value)} />{labels[value]}</label>)}</div>
    {error ? <p id={`${name}-error`} role="alert" className="mt-2 text-sm text-destructive">{error}</p> : null}
  </fieldset>;
}

function Field({ label, description, error, children }: { label: string; description?: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1 text-sm font-medium"><span>{label} <span className="font-normal text-jp-text-secondary">{description}</span></span>{children}{error ? <span role="alert" className="text-sm font-normal text-destructive">{error}</span> : null}</label>;
}

export function PerfumeEditor({ perfume }: { perfume?: Perfume }) {
  const formId = "perfume-editor-form";
  const [state, action, pending] = useActionState(savePerfume, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stagedVariants, setStagedVariants] = useState<StagedVariant[]>([]);
  const [imagePreview, setImagePreview] = useState<string>();
  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [dirty]);
  useEffect(() => () => { if (imagePreview) URL.revokeObjectURL(imagePreview); }, [imagePreview]);
  const selected = (key: "scentCharacters" | "occasions" | "timesOfDay") => perfume?.[key] ?? [];

  return <div className="max-w-6xl">
    <div onChange={() => setDirty(true)} className="border border-jp-admin-border bg-jp-admin-surface">
      <form ref={formRef} action={action} id={formId}>
        <input type="hidden" name="id" value={perfume?.id ?? ""} />
        <input type="hidden" name="stagedVariants" value={JSON.stringify(stagedVariants)} />
      </form>
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-jp-admin-border p-5 sm:p-7">
        <div><p className="text-[11px] font-semibold uppercase tracking-[.14em] text-jp-text-secondary">{perfume ? "Catalogue / Edit" : "Catalogue / New"}</p><h1 className="mt-1 font-display text-4xl sm:text-5xl">{perfume ? perfume.name : "Create perfume"}</h1></div>
        <div className="flex gap-2"><button type="button" className="h-10 border border-jp-admin-border px-4 text-sm font-semibold" onClick={() => setPreviewOpen(true)}>Preview product</button><button form={formId} disabled={pending} className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white" type="submit">{pending ? "Saving…" : perfume ? "Save changes" : "Create perfume"}</button></div>
      </header>
      <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Name" description="Required" error={state.errors?.name}><input form={formId} name="name" required defaultValue={perfume?.name} className="h-10 border border-jp-admin-border bg-white px-3" /></Field><Field label="Slug" description="Required · stable public identifier" error={state.errors?.slug}><input form={formId} name="slug" required defaultValue={perfume?.slug} className="h-10 border border-jp-admin-border bg-white px-3" /></Field></div>
          <Field label="Scent cue" description="Required · short card description" error={state.errors?.scentCue}><input form={formId} name="scentCue" defaultValue={perfume?.scentCue} className="h-10 border border-jp-admin-border bg-white px-3" /></Field>
          <Field label="Description" description="Required for published perfumes" error={state.errors?.description}><textarea form={formId} name="description" defaultValue={perfume?.description} className="min-h-32 border border-jp-admin-border bg-white p-3" /></Field>
          <div className="grid gap-5 sm:grid-cols-2"><Field label="Status"><select form={formId} name="status" defaultValue={perfume?.status ?? "DRAFT"} className="h-10 border border-jp-admin-border bg-white px-3"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option></select></Field><label className="flex items-center gap-3 self-end border border-jp-admin-border bg-white px-3 py-2.5 text-sm"><input form={formId} name="isFeatured" type="checkbox" defaultChecked={perfume?.isFeatured} />Feature on homepage</label></div>
          <ChoiceGroup form={formId} name="scentCharacters" title="Scent character" options={scentCharacters} selected={selected("scentCharacters")} error={state.errors?.scentCharacters} />
          <ChoiceGroup form={formId} name="occasions" title="Occasions" options={occasions} selected={selected("occasions")} error={state.errors?.occasions} />
          <ChoiceGroup form={formId} name="timesOfDay" title="Time of day" options={timesOfDay} selected={selected("timesOfDay")} error={state.errors?.timesOfDay} />
        </div>
        <aside className="space-y-6 border-t border-jp-admin-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <section><h2 className="font-display text-3xl">Primary image</h2><p className="mt-1 text-sm text-jp-text-secondary">One controlled image is used in catalogue cards.</p>{perfume ? <PrimaryImageManager perfumeId={perfume.id} image={perfume.images[0]} /> : <CreateImage form={formId} preview={imagePreview} onPreview={setImagePreview} error={state.errors?.primaryImage} />}</section>
          <section className="border-t border-jp-admin-border pt-5"><h2 className="font-display text-2xl">Bestseller</h2><p className="mt-2 text-sm text-jp-text-secondary">Bestseller is selected from Admin Overview to keep a single eligible product.</p><a href="/admin" className="mt-3 inline-block text-sm font-semibold underline">Manage Bestseller</a></section>
        </aside>
      </div>
      <div className="border-t border-jp-admin-border p-5 sm:p-7">{perfume ? <VariantManager perfumeId={perfume.id} variants={perfume.variants} /> : <StagedVariantManager variants={stagedVariants} onChange={setStagedVariants} />}<section className="mt-6 border border-jp-admin-border bg-jp-stone p-4"><h2 className="font-display text-2xl">Recommendation summary</h2><p className="mt-2 text-sm text-jp-text-secondary">{selected("scentCharacters").map((value) => labels[value]).join(" · ") || "Choose scent character"} / {selected("occasions").map((value) => labels[value]).join(" · ") || "Choose occasions"} / {selected("timesOfDay").map((value) => labels[value]).join(" · ") || "Choose time of day"}</p></section></div>
      {state.errors?.form || state.errors?.variants || state.message ? <p role="alert" className="mx-5 mb-5 text-sm text-destructive sm:mx-7">{state.errors?.form ?? state.errors?.variants ?? state.message}</p> : null}
    </div>
    <ProductPreview open={previewOpen} onOpenChange={setPreviewOpen} form={formRef} imageUrl={imagePreview ?? perfume?.images[0]?.signedUrl} variants={perfume?.variants.map((variant) => ({ priceMinor: variant.priceMinor, quantity: variant.quantity })) ?? stagedVariants.map((variant) => ({ priceMinor: parseNairaToMinor(variant.price) ?? 0, quantity: Number(variant.quantity) || 0 }))} />
  </div>;
}

function CreateImage({ form, preview, onPreview, error }: { form: string; preview?: string; onPreview: (url?: string) => void; error?: string }) {
  return <div className="mt-4 space-y-3"><div className="flex aspect-square items-center justify-center border border-dashed border-jp-admin-border bg-jp-stone">{preview ? <Image unoptimized src={preview} alt="Selected primary image preview" width={320} height={320} className="h-full w-full object-contain" /> : <span className="px-4 text-center text-sm text-jp-text-secondary">No image selected</span>}</div><Field label="Image file" description="JPEG, PNG, WebP · 5 MiB max" error={error}><input form={form} name="primaryImage" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.currentTarget.files?.[0]; onPreview(file ? URL.createObjectURL(file) : undefined); }} className="text-sm" /></Field><Field label="Alt text" description="Describe the bottle"><input form={form} name="primaryImageAlt" className="h-10 border border-jp-admin-border bg-white px-3" /></Field></div>;
}

export function StagedVariantManager({ variants, onChange }: { variants: StagedVariant[]; onChange: (variants: StagedVariant[]) => void }) {
  const [open, setOpen] = useState(false); const [draft, setDraft] = useState<StagedVariant>({ sizeValue: "", price: "", quantity: "" }); const [error, setError] = useState("");
  const save = () => { if (!draft.sizeValue || parseNairaToMinor(draft.price) === null || !/^\d+$/.test(draft.quantity)) { setError("Enter a positive size, valid NGN price, and whole quantity."); return; } if (variants.some((variant) => variant.sizeValue === draft.sizeValue)) { setError("Each staged variant needs a unique size."); return; } onChange([...variants, draft]); setDraft({ sizeValue: "", price: "", quantity: "" }); setError(""); setOpen(false); };
  return <section><div className="flex items-center justify-between gap-3"><div><h2 className="font-display text-3xl">Variants</h2><p className="mt-1 text-sm text-jp-text-secondary">Add sellable sizes before creating this perfume.</p></div><button type="button" onClick={() => setOpen(true)} className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white">Add variant</button></div><VariantTable variants={variants.map((variant, index) => ({ ...variant, id: String(index) }))} onRemove={(index) => onChange(variants.filter((_, current) => current !== index))} /><ModalShell open={open} onOpenChange={setOpen} title="Add variant" description="Size is measured in mL; prices are entered in NGN."><div className="grid gap-4"><Field label="Size (mL)"><input value={draft.sizeValue} inputMode="decimal" onChange={(event) => setDraft({ ...draft, sizeValue: event.target.value })} className="h-10 border border-jp-admin-border px-3" /></Field><Field label="Price (NGN)"><input value={draft.price} inputMode="decimal" onChange={(event) => setDraft({ ...draft, price: event.target.value })} className="h-10 border border-jp-admin-border px-3" /></Field><Field label="Quantity"><input value={draft.quantity} inputMode="numeric" onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} className="h-10 border border-jp-admin-border px-3" /></Field>{error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}<button type="button" onClick={save} className="h-10 bg-jp-admin-action text-sm font-semibold text-white">Stage variant</button></div></ModalShell></section>;
}

function VariantTable({ variants, onRemove }: { variants: Array<{ id: string; sizeValue: string; price: string; quantity: string }>; onRemove: (index: number) => void }) { return variants.length ? <div className="mt-4 divide-y border border-jp-admin-border">{variants.map((variant, index) => <div key={variant.id} className="grid gap-2 p-3 text-sm sm:grid-cols-[1fr_1fr_1fr_auto]"><span>{variant.sizeValue} mL</span><span>{formatNairaFromMinor(parseNairaToMinor(variant.price) ?? 0)}</span><span>{variant.quantity} in stock</span><button type="button" onClick={() => onRemove(index)} className="text-left text-destructive underline">Remove</button></div>)}</div> : <div className="mt-4 border border-dashed border-jp-admin-border p-5 text-sm text-jp-text-secondary">No variants yet. Add a sellable size to publish this perfume.</div>; }

export function ProductPreview({ open, onOpenChange, form, imageUrl, variants }: { open: boolean; onOpenChange: (open: boolean) => void; form: React.RefObject<HTMLFormElement | null>; imageUrl?: string; variants: Array<{ priceMinor: number; quantity: number }> }) { const [compact, setCompact] = useState(false); const input = (name: string) => (form.current?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? ""; const available = variants.some((variant) => variant.quantity > 0); const startingPrice = variants.length ? Math.min(...variants.map((variant) => variant.priceMinor)) : 0; return <ModalShell open={open} onOpenChange={onOpenChange} title="Product preview" description="Unsaved state only — this never changes the catalogue."><div className="flex justify-end"><button type="button" aria-pressed={compact} onClick={() => setCompact(!compact)} className="border border-jp-admin-border px-3 py-2 text-sm">{compact ? "Show large card" : "Show compact card"}</button></div><article className={compact ? "mt-4 flex gap-4 border p-4" : "mt-4 border p-5"}><div className={compact ? "h-28 w-24 shrink-0 bg-jp-stone" : "flex h-64 items-center justify-center bg-jp-stone"}>{imageUrl ? <Image unoptimized src={imageUrl} alt={input("primaryImageAlt") || `${input("name") || "Perfume"} bottle`} width={600} height={600} className="h-full w-full object-contain" /> : <span className="text-sm text-jp-text-secondary">Primary image</span>}</div><div className={compact ? "min-w-0" : "mt-5"}><p className="text-[11px] uppercase tracking-[.14em] text-jp-text-secondary">{available ? "Available" : "Unavailable"}</p><h2 className="font-display text-3xl">{input("name") || "Untitled perfume"}</h2><p className="mt-1 text-sm text-jp-text-secondary">{input("scentCue") || "A short scent cue will appear here."}</p><p className="mt-3 text-sm font-semibold">{variants.length ? `From ${formatNairaFromMinor(startingPrice)}` : "Price to be confirmed"}</p></div></article></ModalShell>; }
