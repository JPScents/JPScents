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

export type AdminPerfume = {
  id: string;
  name: string;
  slug: string;
  scentCue: string;
  description: string;
  status: PerfumeStatus;
  scentCharacters: ScentCharacter[];
  occasions: Occasion[];
  timesOfDay: TimeOfDay[];
  isFeatured: boolean;
  isBestseller: boolean;
  images: Array<{ id: string; path: string; altText: string; signedUrl?: string }>;
  variants: Array<{
    id: string;
    sizeValue: string;
    sizeUnit: string;
    priceMinor: number;
    quantity: number;
  }>;
};

export type AdminPerfumeListItem = {
  id: string;
  name: string;
  scentCharacters: ScentCharacter[];
  isFeatured: boolean;
  isBestseller: boolean;
  primaryImageUrl?: string;
  variantCount: number;
  availableVariantCount: number;
  totalQuantity: number;
  isAvailable: boolean;
};

export type BestsellerCandidate = {
  id: string;
  name: string;
  scentCharacters: ScentCharacter[];
  primaryImageUrl?: string;
  variantCount: number;
  totalQuantity: number;
  orderCount: number;
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

export type VariantActionState = {
  errors?: Record<string, string>;
  message?: string;
  ok?: boolean;
};
export type PerfumeActionState = { errors?: Record<string, string>; message?: string };
export type ImageActionState = { error?: string; ok?: boolean };

export type StagedVariant = { sizeValue: string; price: string; quantity: string };
