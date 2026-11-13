"use client";

import { useActionState, useEffect, useState } from "react";
import { savePerfume } from "../_actions/save-perfume.action";
import { parseNairaToMinor } from "@/modules/catalogue";
import type { StagedVariant } from "../_lib/staged-variant";
import type { AdminPerfume, PerfumeActionState, PerfumeInput } from "@/modules/catalogue";

function slugFromName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function usePerfumeEditor(perfume?: AdminPerfume) {
  const [state, action, pending] = useActionState(savePerfume, {} as PerfumeActionState);
  const [dirty, setDirty] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [stagedVariants, setStagedVariants] = useState<StagedVariant[]>([]);
  const [imagePreview, setImagePreview] = useState<string>();
  const [slugEdited, setSlugEdited] = useState(Boolean(perfume));
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [form, setForm] = useState<PerfumeInput & { primaryImageAlt: string }>({
    name: perfume?.name ?? "",
    slug: perfume?.slug ?? "",
    scentCue: perfume?.scentCue ?? "",
    description: perfume?.description ?? "",
    status: perfume?.status ?? "PUBLISHED",
    isFeatured: perfume?.isFeatured ?? false,
    scentCharacters: perfume?.scentCharacters ?? [],
    occasions: perfume?.occasions ?? [],
    timesOfDay: perfume?.timesOfDay ?? [],
    primaryImageAlt: perfume?.images[0]?.altText ?? "",
  });
  useEffect(() => {
    const preventUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", preventUnload);
    return () => window.removeEventListener("beforeunload", preventUnload);
  }, [dirty]);
  useEffect(
    () => () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    },
    [imagePreview],
  );
  useEffect(() => {
    // React resets form controls after an action; restore controlled checkbox DOM on failure.
    if (state.errors || state.message) {
      queueMicrotask(() => setRestoreVersion((version) => version + 1));
    }
  }, [state.errors, state.message]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));
  const updateName = (name: string) =>
    setForm((previous) => ({
      ...previous,
      name,
      slug: !perfume && !slugEdited ? slugFromName(name) : previous.slug,
    }));
  const updateSlug = (slug: string) => {
    setSlugEdited(true);
    update("slug", slug);
  };
  const toggleChoice = (key: "scentCharacters" | "occasions" | "timesOfDay", value: string) => {
    setForm((previous) => {
      const values: string[] = previous[key];
      return {
        ...previous,
        [key]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  };
  const previewVariants =
    perfume?.variants ??
    stagedVariants.map((variant) => ({
      priceMinor: parseNairaToMinor(variant.price) ?? 0,
      quantity: Number(variant.quantity) || 0,
    }));
  return {
    state,
    action,
    pending,
    form,
    update,
    updateName,
    updateSlug,
    toggleChoice,
    previewOpen,
    setPreviewOpen,
    stagedVariants,
    setStagedVariants,
    imagePreview,
    setImagePreview,
    restoreVersion,
    markDirty: () => setDirty(true),
    previewVariants,
  };
}
