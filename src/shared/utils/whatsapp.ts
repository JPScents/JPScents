export function normalizeWhatsappNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const normalized = /^0[7-9]\d{9}$/.test(digits) ? `234${digits.slice(1)}` : digits;
  return /^\d{7,15}$/.test(normalized) ? normalized : "";
}
