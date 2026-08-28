import type { Occasion, PerfumeStatus, ScentCharacter, TimeOfDay } from "@/db/generated/client";

export const scentCharacters = ["FRESH", "WARM", "SWEET", "WOODY"] as const;
export const occasions = ["EVERYDAY", "WORK", "DATE_NIGHT", "SPECIAL_OCCASION"] as const;
export const timesOfDay = ["DAY", "NIGHT"] as const;
export type PerfumeInput = { name: string; slug: string; scentCue: string; description: string; status: PerfumeStatus; isFeatured: boolean; scentCharacters: ScentCharacter[]; occasions: Occasion[]; timesOfDay: TimeOfDay[] };
export type VariantInput = { sizeValue: string; priceMinor: number; quantity: number };
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const enumValues = <T extends string>(values: FormDataEntryValue[], options: readonly T[]) => values.filter((value): value is T => typeof value === "string" && (options as readonly string[]).includes(value));
export function parsePerfumeInput(formData: FormData): { input?: PerfumeInput; errors: Record<string, string> } { const input = { name: text(formData.get("name")), slug: text(formData.get("slug")).toLowerCase(), scentCue: text(formData.get("scentCue")), description: text(formData.get("description")), status: formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT", isFeatured: formData.get("isFeatured") === "on", scentCharacters: enumValues(formData.getAll("scentCharacters"), scentCharacters), occasions: enumValues(formData.getAll("occasions"), occasions), timesOfDay: enumValues(formData.getAll("timesOfDay"), timesOfDay) } as PerfumeInput; const errors: Record<string, string> = {}; if (!input.name) errors.name = "Name is required."; if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) errors.slug = "Use lower-case letters, numbers, and hyphens."; if (input.status === "PUBLISHED") { if (!input.scentCue) errors.scentCue = "Scent cue is required to publish."; if (!input.description) errors.description = "Description is required to publish."; if (!input.scentCharacters.length) errors.scentCharacters = "Choose a scent character to publish."; if (!input.occasions.length) errors.occasions = "Choose an occasion to publish."; if (!input.timesOfDay.length) errors.timesOfDay = "Choose a time of day to publish."; } return { input, errors }; }
export function parseNairaToMinor(value: string): number | null { if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null; const [whole, decimal = ""] = value.split("."); const amount = BigInt(whole) * BigInt(100) + BigInt((decimal + "00").slice(0, 2)); return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null; }
export function normalizeSizeValue(value: string): string | null { if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0) return null; return Number(value).toFixed(2); }
/** Formats integer kobo without converting through a floating-point currency value. */
export function formatNairaFromMinor(minor: number): string {
  const whole = Math.trunc(minor / 100).toLocaleString("en-NG");
  const fraction = Math.abs(minor % 100);
  return fraction ? `₦${whole}.${fraction.toString().padStart(2, "0")}` : `₦${whole}`;
}
export function parseVariantInput(formData: FormData): { input?: VariantInput; errors: Record<string, string> } { const sizeValue = text(formData.get("sizeValue")); const priceMinor = parseNairaToMinor(text(formData.get("price"))); const quantityText = text(formData.get("quantity")); const quantity = Number(quantityText); const errors: Record<string, string> = {}; if (!/^\d+(?:\.\d{1,2})?$/.test(sizeValue) || Number(sizeValue) <= 0) errors.sizeValue = "Size must be positive."; if (priceMinor === null) errors.price = "Enter a Naira amount with up to two decimals."; if (!/^\d+$/.test(quantityText) || !Number.isSafeInteger(quantity) || quantity < 0) errors.quantity = "Quantity must be a non-negative whole number."; return { input: Object.keys(errors).length ? undefined : { sizeValue, priceMinor: priceMinor!, quantity }, errors }; }
export function parseStagedVariants(value: FormDataEntryValue | null): { variants: VariantInput[]; error?: string } { if (typeof value !== "string" || !value) return { variants: [] }; try { const raw: unknown = JSON.parse(value); if (!Array.isArray(raw)) throw new Error(); const variants = raw.map((item) => { if (!item || typeof item !== "object") throw new Error(); const candidate = item as Record<string, unknown>; const form = new FormData(); form.set("sizeValue", String(candidate.sizeValue ?? "")); form.set("price", String(candidate.price ?? "")); form.set("quantity", String(candidate.quantity ?? "")); const parsed = parseVariantInput(form); if (!parsed.input) throw new Error(); return parsed.input; }); const keys = new Set<string>(); for (const variant of variants) { const key = `${normalizeSizeValue(variant.sizeValue)}:ML`; if (keys.has(key)) return { variants: [], error: "Each staged variant needs a unique size." }; keys.add(key); } return { variants }; } catch { return { variants: [], error: "One or more staged variants are invalid." }; } }
export function publishingErrors(input: PerfumeInput, imageCount: number, positiveVariantCount: number) { const errors: Record<string, string> = {}; if (input.status === "PUBLISHED") { if (!input.name || !input.slug || !input.scentCue || !input.description) errors.form = "Publishing requires complete customer-facing details."; else if (!imageCount) errors.form = "Publishing requires a primary image with alt text."; else if (!input.scentCharacters.length || !input.occasions.length || !input.timesOfDay.length) errors.form = "Publishing requires maintained recommendation attributes."; else if (!positiveVariantCount) errors.form = "Publishing requires an in-stock, priced variant."; } return errors; }

export function imageInputError(file: FormDataEntryValue | null, altText: string) {
  if (!(file instanceof File) || file.size === 0) return "Choose an image file.";
  if (!altText.trim()) return "Useful alt text is required.";
  if (!allowedImageTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
    return "Use JPEG, PNG, or WebP up to 5 MiB.";
  }
  return undefined;
}
