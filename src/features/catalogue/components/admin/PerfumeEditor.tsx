"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { occasions, scentCharacters, timesOfDay } from "../../constants";
import { parseNairaToMinor } from "../../utils/price.utils";
import { savePerfume, type PerfumeActionState } from "../../actions/save-perfume.admin.action";
import { PrimaryImageManager } from "./PrimaryImageManager";
import { ProductPreview } from "./ProductPreview";
import { StagedVariantManager } from "./StagedVariantManager";
import { VariantManager } from "./VariantManager";

type Perfume = NonNullable<Awaited<ReturnType<typeof import("../../catalogue").getAdminPerfume>>>;
type StagedVariant = { sizeValue: string; price: string; quantity: string };
const initial: PerfumeActionState = {};
const labels: Record<string, string> = {
  FRESH: "Fresh",
  WARM: "Warm",
  SWEET: "Sweet",
  WOODY: "Woody",
  EVERYDAY: "Everyday",
  WORK: "Work",
  DATE_NIGHT: "Date night",
  SPECIAL_OCCASION: "Special occasion",
  DAY: "Day",
  NIGHT: "Night",
};

function slugFromName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function SelectionChip({
  checked,
  children,
  form,
  name,
  onChange,
  resetKey,
  value,
}: {
  checked: boolean;
  children: React.ReactNode;
  form: string;
  name: string;
  onChange: (checked: boolean) => void;
  resetKey: number;
  value: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        key={`${value}-${resetKey}`}
        checked={checked}
        className="peer sr-only"
        form={form}
        name={name}
        onChange={(event) => onChange(event.currentTarget.checked)}
        type="checkbox"
        value={value}
      />
      <span className="inline-flex min-h-8.5 items-center border border-[#afa79b] bg-[#fbf9f4] px-2.5 py-2 text-[11px] font-semibold text-jp-text-primary transition-colors peer-checked:border-[#2d2c27] peer-checked:bg-[#2d2c27] peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-jp-admin-action">
        {children}
      </span>
    </label>
  );
}

function ChoiceGroup({
  name,
  title,
  options,
  selected,
  error,
  form,
  onToggle,
  resetKey,
}: {
  name: string;
  title: string;
  options: readonly string[];
  selected: string[];
  error?: string;
  form: string;
  onToggle: (value: string) => void;
  resetKey: number;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined} className="mt-4">
      <legend className="text-[10px] font-semibold uppercase tracking-[.14em] text-jp-text-secondary">
        {title}
      </legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((value) => (
          <SelectionChip
            key={value}
            checked={selected.includes(value)}
            form={form}
            name={name}
            onChange={() => onToggle(value)}
            resetKey={resetKey}
            value={value}
          >
            {labels[value]}
          </SelectionChip>
        ))}
      </div>
      {error ? (
        <p id={`${name}-error`} role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function Field({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      <span>
        {label} <span className="font-normal text-jp-text-secondary">{description}</span>
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-sm font-normal text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function PerfumeEditor({ perfume }: { perfume?: Perfume }) {
  const formId = "perfume-editor-form";
  const [state, action, pending] = useActionState(savePerfume, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stagedVariants, setStagedVariants] = useState<StagedVariant[]>([]);
  const [imagePreview, setImagePreview] = useState<string>();
  const [name, setName] = useState(perfume?.name ?? "");
  const [slug, setSlug] = useState(perfume?.slug ?? "");
  const [scentCue, setScentCue] = useState(perfume?.scentCue ?? "");
  const [description, setDescription] = useState(perfume?.description ?? "");
  const [status, setStatus] = useState(perfume?.status ?? "PUBLISHED");
  const [isFeatured, setIsFeatured] = useState(perfume?.isFeatured ?? false);
  const [scentCharacterValues, setScentCharacterValues] = useState(perfume?.scentCharacters ?? []);
  const [occasionValues, setOccasionValues] = useState(perfume?.occasions ?? []);
  const [timeOfDayValues, setTimeOfDayValues] = useState(perfume?.timesOfDay ?? []);
  const [primaryImageAlt, setPrimaryImageAlt] = useState("");
  const [slugEdited, setSlugEdited] = useState(Boolean(perfume));
  const [restoreVersion, setRestoreVersion] = useState(0);
  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (dirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [dirty]);
  useEffect(
    () => () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    },
    [imagePreview],
  );
  useEffect(() => {
    if (state.errors || state.message)
      queueMicrotask(() => setRestoreVersion((version) => version + 1));
  }, [state.errors, state.message]);
  const toggle = <T extends string>(values: T[], value: T) =>
    values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

  return (
    <div className="max-w-6xl">
      <div
        onChange={() => setDirty(true)}
        className="border border-jp-admin-border bg-jp-admin-surface"
      >
        <form ref={formRef} action={action} id={formId} onReset={(event) => event.preventDefault()}>
          <input type="hidden" name="id" value={perfume?.id ?? ""} />
          <input type="hidden" name="stagedVariants" value={JSON.stringify(stagedVariants)} />
        </form>
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-jp-admin-border p-5 sm:p-7">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-jp-text-secondary">
              {perfume ? "Catalogue / Edit" : "Catalogue / New"}
            </p>
            <h1 className="mt-1 font-display text-4xl sm:text-5xl">
              {perfume ? perfume.name : "Create perfume"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="h-10 border border-jp-admin-border px-4 text-sm font-semibold"
              onClick={() => setPreviewOpen(true)}
            >
              Preview product
            </button>
            <button
              form={formId}
              disabled={pending}
              className="h-10 bg-jp-admin-action px-4 text-sm font-semibold text-white"
              type="submit"
            >
              {pending ? "Saving…" : perfume ? "Save changes" : "Create perfume"}
            </button>
          </div>
        </header>
        <div className="grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <div className="space-y-6">
            <section className="border border-jp-admin-border bg-[#fbf9f4] p-5">
              <h2 className="font-display text-[28px] leading-8">Perfume details</h2>
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" description="Required" error={state.errors?.name}>
                    <input
                      form={formId}
                      name="name"
                      required
                      value={name}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        setName(nextName);
                        if (!perfume && !slugEdited) setSlug(slugFromName(nextName));
                      }}
                      className="h-10 border border-jp-admin-border bg-white px-3"
                    />
                  </Field>
                  <Field
                    label="Slug"
                    description="Required · stable public identifier"
                    error={state.errors?.slug}
                  >
                    <input
                      form={formId}
                      name="slug"
                      required
                      value={slug}
                      onChange={(event) => {
                        setSlugEdited(true);
                        setSlug(event.target.value);
                      }}
                      className="h-10 border border-jp-admin-border bg-white px-3"
                    />
                  </Field>
                </div>
                <Field
                  label="Scent cue"
                  description="Required · short card description"
                  error={state.errors?.scentCue}
                >
                  <input
                    form={formId}
                    name="scentCue"
                    value={scentCue}
                    onChange={(event) => setScentCue(event.target.value)}
                    className="h-10 border border-jp-admin-border bg-white px-3"
                  />
                </Field>
                <Field
                  label="Description"
                  description="Required for published perfumes"
                  error={state.errors?.description}
                >
                  <textarea
                    form={formId}
                    name="description"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-19 border border-jp-admin-border bg-white p-3"
                  />
                </Field>
              </div>
              <label className="mt-4 flex cursor-pointer items-center justify-between border border-jp-admin-border bg-[#eae3d7] px-4 py-3.5">
                <input
                  key={`featured-${restoreVersion}`}
                  aria-label="Feature on homepage"
                  form={formId}
                  name="isFeatured"
                  type="checkbox"
                  value="on"
                  checked={isFeatured}
                  onChange={(event) => setIsFeatured(event.currentTarget.checked)}
                  className="peer sr-only"
                />
                <span>
                  <span className="block text-xs font-semibold">Featured</span>
                  <span className="mt-0.5 block text-[11px] text-jp-text-secondary">
                    Show this perfume in featured customer-facing placements.
                  </span>
                </span>
                <span className="flex h-5.5 w-10 shrink-0 items-center rounded-[11px] bg-[#bdb5aa] p-0.75 transition-colors after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#30342c] peer-checked:after:translate-x-4" />
              </label>
              <label className="mt-4 flex cursor-pointer items-center justify-between border border-jp-admin-border bg-[#eae3d7] px-4 py-3.5">
                <input form={formId} name="status" type="hidden" value={status} />
                <input
                  key={`published-${restoreVersion}`}
                  aria-label="Published"
                  checked={status === "PUBLISHED"}
                  className="peer sr-only"
                  onChange={(event) =>
                    setStatus(event.currentTarget.checked ? "PUBLISHED" : "DRAFT")
                  }
                  type="checkbox"
                />
                <span>
                  <span className="block text-xs font-semibold">Published</span>
                  <span className="mt-0.5 block text-[11px] text-jp-text-secondary">
                    Make this perfume visible in the customer-facing catalogue.
                  </span>
                </span>
                <span className="flex h-5.5 w-10 shrink-0 items-center rounded-[11px] bg-[#bdb5aa] p-0.75 transition-colors after:size-4 after:rounded-full after:bg-white after:transition-transform peer-checked:bg-[#30342c] peer-checked:after:translate-x-4" />
              </label>
              <section className="mt-4">
                <h3 className="text-xs font-semibold">Help Me Choose attributes</h3>
                <p className="mt-0.5 text-[11px] text-jp-text-secondary">
                  These maintained selections determine where this perfume appears in recommendation
                  results.
                </p>
                <ChoiceGroup
                  form={formId}
                  name="scentCharacters"
                  title="Scent character"
                  options={scentCharacters}
                  selected={scentCharacterValues}
                  resetKey={restoreVersion}
                  onToggle={(value) =>
                    setScentCharacterValues((values) =>
                      toggle(values, value as (typeof values)[number]),
                    )
                  }
                  error={state.errors?.scentCharacters}
                />
                <ChoiceGroup
                  form={formId}
                  name="occasions"
                  title="Occasion"
                  options={occasions}
                  selected={occasionValues}
                  resetKey={restoreVersion}
                  onToggle={(value) =>
                    setOccasionValues((values) => toggle(values, value as (typeof values)[number]))
                  }
                  error={state.errors?.occasions}
                />
                <ChoiceGroup
                  form={formId}
                  name="timesOfDay"
                  title="Time of day"
                  options={timesOfDay}
                  selected={timeOfDayValues}
                  resetKey={restoreVersion}
                  onToggle={(value) =>
                    setTimeOfDayValues((values) => toggle(values, value as (typeof values)[number]))
                  }
                  error={state.errors?.timesOfDay}
                />
              </section>
            </section>
          </div>
          <aside className="space-y-6 border-t border-jp-admin-border pt-6 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <section>
              <h2 className="font-display text-3xl">Primary image</h2>
              <p className="mt-1 text-sm text-jp-text-secondary">
                One controlled image is used in catalogue cards.
              </p>
              {perfume ? (
                <PrimaryImageManager perfumeId={perfume.id} image={perfume.images[0]} />
              ) : (
                <CreateImage
                  form={formId}
                  preview={imagePreview}
                  onPreview={setImagePreview}
                  primaryImageAlt={primaryImageAlt}
                  onPrimaryImageAltChange={setPrimaryImageAlt}
                  error={state.errors?.primaryImage}
                />
              )}
            </section>
            <section className="border-t border-jp-admin-border pt-5">
              <h2 className="font-display text-2xl">Bestseller</h2>
              <p className="mt-2 text-sm text-jp-text-secondary">
                Bestseller is selected from Admin Overview to keep a single eligible product.
              </p>
              <a href="/admin" className="mt-3 inline-block text-sm font-semibold underline">
                Manage Bestseller
              </a>
            </section>
          </aside>
        </div>
        <div className="border-t border-jp-admin-border p-5 sm:p-7">
          {perfume ? (
            <VariantManager perfumeId={perfume.id} variants={perfume.variants} />
          ) : (
            <StagedVariantManager variants={stagedVariants} onChange={setStagedVariants} />
          )}
          <section className="mt-6 border border-jp-admin-border bg-jp-stone p-4">
            <h2 className="font-display text-2xl">Recommendation summary</h2>
            <p className="mt-2 text-sm text-jp-text-secondary">
              {scentCharacterValues.map((value) => labels[value]).join(" · ") ||
                "Choose scent character"}{" "}
              / {occasionValues.map((value) => labels[value]).join(" · ") || "Choose occasions"} /{" "}
              {timeOfDayValues.map((value) => labels[value]).join(" · ") || "Choose time of day"}
            </p>
          </section>
        </div>
        {state.errors?.form || state.errors?.variants || state.message ? (
          <p role="alert" className="mx-5 mb-5 text-sm text-destructive sm:mx-7">
            {state.errors?.form ?? state.errors?.variants ?? state.message}
          </p>
        ) : null}
      </div>
      <ProductPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        form={formRef}
        imageUrl={imagePreview ?? perfume?.images[0]?.signedUrl}
        variants={
          perfume?.variants.map((variant) => ({
            priceMinor: variant.priceMinor,
            quantity: variant.quantity,
          })) ??
          stagedVariants.map((variant) => ({
            priceMinor: parseNairaToMinor(variant.price) ?? 0,
            quantity: Number(variant.quantity) || 0,
          }))
        }
      />
    </div>
  );
}

function CreateImage({
  form,
  preview,
  onPreview,
  primaryImageAlt,
  onPrimaryImageAltChange,
  error,
}: {
  form: string;
  preview?: string;
  onPreview: (url?: string) => void;
  primaryImageAlt: string;
  onPrimaryImageAltChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex aspect-square items-center justify-center border border-dashed border-jp-admin-border bg-jp-stone">
        {preview ? (
          <Image
            unoptimized
            src={preview}
            alt="Selected primary image preview"
            width={320}
            height={320}
            className="h-full w-full object-contain"
          />
        ) : (
          <span className="px-4 text-center text-sm text-jp-text-secondary">No image selected</span>
        )}
      </div>
      <div className="grid gap-1 text-sm font-medium">
        <span>
          Image file{" "}
          <span className="font-normal text-jp-text-secondary">JPEG, PNG, WebP · 5 MiB max</span>
        </span>
        <input
          className="sr-only"
          form={form}
          id="primary-image"
          name="primaryImage"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            onPreview(file ? URL.createObjectURL(file) : undefined);
          }}
        />
        <label
          htmlFor="primary-image"
          className="flex h-10 cursor-pointer items-center justify-center border border-jp-text-primary bg-[#fbf9f4] px-3 text-sm font-semibold text-jp-text-primary hover:bg-jp-stone focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-jp-admin-action"
        >
          Upload image
        </label>
        {error ? (
          <span role="alert" className="text-sm font-normal text-destructive">
            {error}
          </span>
        ) : null}
      </div>
      <Field label="Alt text" description="Describe the bottle">
        <input
          form={form}
          name="primaryImageAlt"
          value={primaryImageAlt}
          onChange={(event) => onPrimaryImageAltChange(event.target.value)}
          className="h-10 border border-jp-admin-border bg-white px-3"
        />
      </Field>
    </div>
  );
}
