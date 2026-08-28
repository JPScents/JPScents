"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth/admin";
import { prisma } from "@/db/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsePerfumeInput, parseStagedVariants, publishingErrors } from "../fields";
export type PerfumeActionState = { errors?: Record<string, string>; message?: string };
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
function stagedImage(formData: FormData) { const file = formData.get("primaryImage"); const altText = typeof formData.get("primaryImageAlt") === "string" ? String(formData.get("primaryImageAlt")).trim() : ""; if (!(file instanceof File) || file.size === 0) return { file: null, altText }; if (!allowedImageTypes.has(file.type) || file.size > 5 * 1024 * 1024) return { file: null, altText, error: "Use JPEG, PNG, or WebP up to 5 MiB." }; if (!altText) return { file: null, altText, error: "Useful alt text is required." }; return { file, altText }; }
export async function savePerfume(_: PerfumeActionState, formData: FormData): Promise<PerfumeActionState> {
  if (!await getCurrentAdmin()) return { message: "You are not authorized to manage the catalogue." };
  const id = formData.get("id"); const { input, errors } = parsePerfumeInput(formData); if (!input || Object.keys(errors).length) return { errors };
  const existing = typeof id === "string" && id ? await prisma.perfume.findUnique({ where: { id }, include: { images: true, variants: true } }) : null;
  if (typeof id === "string" && id && !existing) return { message: "This perfume no longer exists." };
  const conflict = await prisma.perfume.findUnique({ where: { slug: input.slug } }); if (conflict && conflict.id !== existing?.id) return { errors: { slug: "That slug is already in use." } };
  const staged = parseStagedVariants(formData.get("stagedVariants")); if (staged.error) return { errors: { variants: staged.error } };
  const image = stagedImage(formData); if (image.error) return { errors: { primaryImage: image.error } };
  const variants = existing?.variants ?? staged.variants;
  const publish = publishingErrors(input, existing?.images.length ?? (image.file ? 1 : 0), variants.filter((variant) => variant.quantity > 0 && variant.priceMinor >= 0).length); if (Object.keys(publish).length) return { errors: publish };
  if (existing?.isBestseller && input.status !== "PUBLISHED") return { message: "Replace or clear the active Bestseller before unpublishing it." };
  if (existing) { await prisma.perfume.update({ where: { id: existing.id }, data: input }); revalidatePath("/admin/perfumes"); redirect(`/admin/perfumes/${existing.id}`); }
  // Allocate the database identifier before storage so a failed upload cannot leave a
  // partially-created perfume (variants intentionally use RESTRICT deletion).
  const perfumeId = randomUUID();
  let uploadedPath: string | undefined;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> | undefined;
  if (image.file) {
    const extension = image.file.type === "image/jpeg" ? "jpg" : image.file.type.split("/")[1];
    uploadedPath = `perfumes/${perfumeId}/${randomUUID()}.${extension}`;
    supabase = await createSupabaseServerClient();
    const upload = await supabase.storage.from("perfume-images").upload(uploadedPath, image.file, { contentType: image.file.type, upsert: false });
    if (upload.error) return { message: "Image upload failed. No perfume was created; please try again." };
  }
  try {
    await prisma.perfume.create({
      data: {
        id: perfumeId,
        ...input,
        images: uploadedPath ? { create: { path: uploadedPath, altText: image.altText, position: 0 } } : undefined,
        variants: staged.variants.length ? { create: staged.variants.map((variant) => ({ ...variant, sizeUnit: "ML" })) } : undefined,
      },
    });
  } catch (error) {
    if (uploadedPath && supabase) await supabase.storage.from("perfume-images").remove([uploadedPath]);
    const code = typeof error === "object" && error && "code" in error ? (error as { code?: string }).code : undefined;
    if (code === "P2002") return { errors: { slug: "That slug was just claimed. Choose another stable slug." } };
    return { message: "The perfume could not be saved. Any uploaded image was removed." };
  }
  revalidatePath("/admin/perfumes");
  redirect(`/admin/perfumes/${perfumeId}`);
}
