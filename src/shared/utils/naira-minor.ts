export const MAX_NAIRA_MINOR = 2_147_483_647;

export function isNairaMinor(value: unknown): value is number {
  return (
    typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_NAIRA_MINOR
  );
}
