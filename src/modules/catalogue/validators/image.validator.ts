const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_PERFUME_IMAGE_MIB = 1;
export const MAX_PERFUME_IMAGE_BYTES = MAX_PERFUME_IMAGE_MIB * 1024 * 1024;
export const PERFUME_IMAGE_SIZE_ERROR = `Choose an image up to ${MAX_PERFUME_IMAGE_MIB} MiB.`;

export function validateImageInput(file: FormDataEntryValue | null, altText: string) {
  if (!(file instanceof File) || file.size === 0) {
    return "Choose an image file.";
  }
  if (!altText.trim()) {
    return "Useful alt text is required.";
  }
  if (file.size > MAX_PERFUME_IMAGE_BYTES) {
    return PERFUME_IMAGE_SIZE_ERROR;
  }
  if (!allowedImageTypes.has(file.type)) {
    return "Use JPEG, PNG, or WebP.";
  }
  return undefined;
}
