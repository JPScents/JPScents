/** Formats integer kobo without converting through a floating-point currency value. */
export function formatNairaFromMinor(minor: number): string {
  const whole = Math.trunc(minor / 100).toLocaleString("en-NG");
  const fraction = Math.abs(minor % 100);
  return fraction ? `₦${whole}.${fraction.toString().padStart(2, "0")}` : `₦${whole}`;
}
