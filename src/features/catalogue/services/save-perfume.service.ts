import "server-only";

import { randomUUID } from "node:crypto";
import { savePerfumeRecord } from "../repositories/perfume.repository";
import type { PerfumeActionState, PerfumeInput, VariantInput } from "../types";
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

  // Upload before creating the record so an upload failure cannot leave a partial perfume.
  const perfumeId = randomUUID();
  let path: string | undefined;
  if (image.file) {
    try {
      path = await uploadPerfumeImage(perfumeId, image.file);
    } catch {
      return { message: "Image upload failed. No perfume was created; please try again." };
    }
  }
  const result = await savePerfumeRecord(perfumeId, input, {
    variants,
    image: path ? { path, altText: image.altText } : undefined,
  });
  if (!result.id && path) {
    await removePerfumeImageFiles([path]);
  }
  return result;
}
