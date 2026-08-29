import type { Occasion, ScentCharacter, TimeOfDay } from "@/db/generated/client";

import type { HelpPreferences } from "../types";

export const publicScentCharacters = ["FRESH", "WARM", "SWEET", "WOODY"] as const;
export const publicOccasions = ["EVERYDAY", "WORK", "DATE_NIGHT", "SPECIAL_OCCASION"] as const;
export const publicTimes = ["DAY", "NIGHT"] as const;

export function parseScent(value: string | string[] | undefined): ScentCharacter | undefined {
  return typeof value === "string" && publicScentCharacters.includes(value as ScentCharacter)
    ? (value as ScentCharacter)
    : undefined;
}

export function parsePreferences(
  params: Record<string, string | string[] | undefined>,
): HelpPreferences {
  const values = (key: string, allowed: readonly string[]) =>
    (Array.isArray(params[key])
      ? params[key]
      : typeof params[key] === "string"
        ? params[key].split(",")
        : []
    ).filter((value): value is string => allowed.includes(value));
  const time =
    typeof params.time === "string" && publicTimes.includes(params.time as TimeOfDay)
      ? (params.time as TimeOfDay)
      : undefined;
  return {
    scentCharacters: values("scent", publicScentCharacters) as ScentCharacter[],
    occasions: values("occasion", publicOccasions) as Occasion[],
    timeOfDay: time,
  };
}
