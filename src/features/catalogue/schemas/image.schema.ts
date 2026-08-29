const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageInput(file: FormDataEntryValue | null, altText: string) {
  if (!(file instanceof File) || file.size === 0) return "Choose an image file.";
  if (!altText.trim()) return "Useful alt text is required.";
  if (!allowedImageTypes.has(file.type) || file.size > 5 * 1024 * 1024)
    return "Use JPEG, PNG, or WebP up to 5 MiB.";
  return undefined;
}
