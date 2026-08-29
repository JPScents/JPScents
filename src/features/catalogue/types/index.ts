import type { Occasion, PerfumeStatus, ScentCharacter, TimeOfDay } from "@/db/generated/client";

export type PerfumeInput = {
  name: string;
  slug: string;
  scentCue: string;
  description: string;
  status: PerfumeStatus;
  isFeatured: boolean;
  scentCharacters: ScentCharacter[];
  occasions: Occasion[];
  timesOfDay: TimeOfDay[];
};

export type VariantInput = { sizeValue: string; priceMinor: number; quantity: number };

export type CatalogueFilters = {
  query?: string;
  availability?: "all" | "available" | "unavailable";
  placement?: "all" | "featured" | "bestseller";
};

export type HelpPreferences = {
  scentCharacters: ScentCharacter[];
  occasions: Occasion[];
  timeOfDay?: TimeOfDay;
};

export type PublicPerfumeCard = {
  id: string;
  slug: string;
  name: string;
  scentCue: string;
  scentCharacters: ScentCharacter[];
  primaryImageUrl?: string;
  primaryImageAlt: string;
  startingPriceMinor?: number;
  startingPrice: string;
  isAvailable: boolean;
  label?: "Bestseller" | "Featured";
};

export type PublicPerfumeDetail = PublicPerfumeCard & {
  description: string;
  occasions: Occasion[];
  timesOfDay: TimeOfDay[];
  variants: Array<{
    id: string;
    sizeLabel: string;
    priceMinor: number;
    price: string;
    quantity: number;
    isAvailable: boolean;
  }>;
};

export type Recommendation = PublicPerfumeCard & { matchReason: string; score: number };
