export function normalizeSizeValue(value: string): string | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) <= 0) return null;
  return Number(value).toFixed(2);
}
