import "server-only";

import { randomUUID } from "node:crypto";
import { checkPerfumeCreationSlug, savePerfumeRecord } from "../repositories/perfume.repository";
import type { PerfumeActionState, PerfumeInput, VariantInput } from "../types";
import { getPublishingErrors } from "../validators/publishing.validator";
import { uploadPerfumeImage, removePerfumeImageFiles } from "./perfume-images.service";

export async function savePerfumeWithImage(
  input: PerfumeInput,
  id: string | null,
  variants: VariantInput[],
  image: { file: File | null; altText: string },
): Promise<PerfumeActionState & { id?: string }> {
  if (id) {
    return savePerfumeRecord(id, input);
  }

  const perfumeId = randomUUID();
  if (!image.file) {
    return savePerfumeRecord(perfumeId, input, { variants });
  }

  // Check before writing to Storage. The repository still checks the slug in the transaction.
  const slugError = await checkPerfumeCreationSlug(input.slug);
  if (slugError) {
    return slugError;
  }
  const errors = getPublishingErrors(
    input,
    1,
    variants.filter((variant) => variant.quantity > 0).length,
  );
  if (Object.keys(errors).length) {
    return { errors };
  }

  let path: string;
  try {
    path = await uploadPerfumeImage(perfumeId, image.file);
  } catch {
    return { message: "Image upload failed. No perfume was created; please try again." };
  }
  const result = await savePerfumeRecord(perfumeId, input, {
    variants,
    image: { path, altText: image.altText },
  });
  if (!result.id) {
    await removePerfumeImageFiles([path]);
  }
  return result;
}
