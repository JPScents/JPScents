export function parseNairaToMinor(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, decimal = ""] = value.split(".");
  const amount = BigInt(whole) * BigInt(100) + BigInt((decimal + "00").slice(0, 2));
  return amount <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(amount) : null;
}
