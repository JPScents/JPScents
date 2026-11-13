import { parseVariantInput } from "./variant-input.parser";

export function parseVariantForm(formData: FormData) {
  return parseVariantInput({
    sizeValue: formData.get("sizeValue"),
    price: formData.get("price"),
    quantity: formData.get("quantity"),
  });
}
