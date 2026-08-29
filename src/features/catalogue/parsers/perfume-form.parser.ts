import { validatePerfumeInput } from "../schemas/perfume.schema";

export function parsePerfumeForm(formData: FormData) {
  return validatePerfumeInput({
    name: formData.get("name"),
    slug: formData.get("slug"),
    scentCue: formData.get("scentCue"),
    description: formData.get("description"),
    status: formData.get("status"),
    isFeatured: formData.get("isFeatured"),
    scentCharacters: formData.getAll("scentCharacters"),
    occasions: formData.getAll("occasions"),
    timesOfDay: formData.getAll("timesOfDay"),
  });
}
