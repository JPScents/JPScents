import { validateVariantInput } from "../schemas/variant.schema";

export function parseVariantForm(formData: FormData) {
  return validateVariantInput({
    sizeValue: formData.get("sizeValue"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
  });
}
