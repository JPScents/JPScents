import { isNairaMinor, MAX_NAIRA_MINOR } from "@/shared/utils/naira-minor";

import { isNigerianDestination, nigerianDestinations } from "../constants/nigeria-regions";
import type { DeliverySetting } from "../types";

function parseRow(value: unknown): DeliverySetting | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const { state, enabled, feeMinor, version } = value as Record<string, unknown>;
  if (
    !isNigerianDestination(state) ||
    typeof enabled !== "boolean" ||
    (feeMinor !== null && !isNairaMinor(feeMinor)) ||
    (enabled && feeMinor === null) ||
    !isNairaMinor(version) ||
    version === MAX_NAIRA_MINOR
  ) {
    return null;
  }
  return { state, enabled, feeMinor, version };
}

export function parseDeliverySettings(value: unknown): DeliverySetting[] | null {
  if (!Array.isArray(value) || !value.length || value.length > nigerianDestinations.length) {
    return null;
  }
  const settings = new Map<string, DeliverySetting>();
  for (const item of value) {
    const row = parseRow(item);
    if (!row || settings.has(row.state)) {
      return null;
    }
    settings.set(row.state, row);
  }
  return [...settings.values()].sort((a, b) => a.state.localeCompare(b.state, "en"));
}
