import { scentCharacters, occasions, timesOfDay } from "../constants/catalogue";
import type { HelpPreferences } from "../types";

export function parseScent(value: string | string[] | undefined) {
  return scentCharacters.find((character) => character === value);
}

export function parsePreferences(
  params: Record<string, string | string[] | undefined>,
): HelpPreferences {
  function values<T extends string>(key: string, allowed: readonly T[]): T[] {
    const raw = params[key];
    const selected = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
    return selected.filter((value): value is T => allowed.some((option) => option === value));
  }
  return {
    scentCharacters: values("scent", scentCharacters),
    occasions: values("occasion", occasions),
    timeOfDay: timesOfDay.find((time) => time === params.time),
  };
}
