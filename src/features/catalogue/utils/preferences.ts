import type { HelpPreferences } from "../types";
import type { Occasion, ScentCharacter, TimeOfDay } from "@/db/generated/client";

type PublicPreference = ScentCharacter | Occasion | TimeOfDay;

export function preferenceLabel(value: PublicPreference) {
  return (
    {
      FRESH: "Fresh",
      WARM: "Warm",
      SWEET: "Sweet",
      WOODY: "Woody",
      EVERYDAY: "Everyday",
      WORK: "Work",
      DATE_NIGHT: "Evening",
      SPECIAL_OCCASION: "Special occasion",
      DAY: "Day",
      NIGHT: "Night",
    } as const
  )[value];
}

export function preferenceSummary(preferences: HelpPreferences) {
  return [
    ...preferences.scentCharacters,
    ...preferences.occasions,
    ...(preferences.timeOfDay ? [preferences.timeOfDay] : []),
  ].map(preferenceLabel);
}
