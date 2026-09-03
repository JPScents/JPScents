import { nigeriaLocations } from "../constants/nigeria-locations";

export function isNigerianState(value: string): value is keyof typeof nigeriaLocations {
  return value in nigeriaLocations;
}

export function isKnownCity(state: keyof typeof nigeriaLocations, city: string) {
  return (nigeriaLocations[state] as readonly string[]).includes(city);
}
