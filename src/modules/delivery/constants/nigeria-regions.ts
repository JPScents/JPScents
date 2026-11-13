// National Bureau of Statistics, National Nutrition and Health Survey 2018, table 3.
export const nigeriaRegions = {
  "North Central": ["Benue", "FCT", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
  "North East": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  "North West": ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
  "South East": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  "South South": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  "South West": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
} as const;

export type NigerianDestination = (typeof nigeriaRegions)[keyof typeof nigeriaRegions][number];

export const nigerianDestinations: readonly NigerianDestination[] =
  Object.values(nigeriaRegions).flat();

export function isNigerianDestination(value: unknown): value is NigerianDestination {
  return nigerianDestinations.some((state) => state === value);
}
