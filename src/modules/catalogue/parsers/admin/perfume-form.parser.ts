import type {
  Occasion,
  ScentCharacter,
  TimeOfDay,
} from "@/infrastructure/database/generated/enums";

import { occasions, scentCharacters, timesOfDay } from "../../constants/catalogue";
import type { PerfumeInput } from "../../types";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const enumValues = <T extends string>(values: unknown[], options: readonly T[]) =>
  values.filter(
    (value): value is T =>
      typeof value === "string" && (options as readonly string[]).includes(value),
  );

export function parsePerfumeForm(formData: FormData): {
  input?: PerfumeInput;
  errors: Record<string, string>;
} {
  const input: PerfumeInput = {
    name: text(formData.get("name")),
    slug: text(formData.get("slug")).toLowerCase(),
    scentCue: text(formData.get("scentCue")),
    description: text(formData.get("description")),
    status: formData.get("status") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    isFeatured: formData.get("isFeatured") === "on",
    scentCharacters: enumValues(
      formData.getAll("scentCharacters"),
      scentCharacters,
    ) as ScentCharacter[],
    occasions: enumValues(formData.getAll("occasions"), occasions) as Occasion[],
    timesOfDay: enumValues(formData.getAll("timesOfDay"), timesOfDay) as TimeOfDay[],
  };
  const errors: Record<string, string> = {};
  if (!input.name) {
    errors.name = "Name is required.";
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    errors.slug = "Use lower-case letters, numbers, and hyphens.";
  }
  if (input.status === "PUBLISHED") {
    if (!input.scentCue) {
      errors.scentCue = "Scent cue is required to publish.";
    }
    if (!input.description) {
      errors.description = "Description is required to publish.";
    }
    if (!input.scentCharacters.length) {
      errors.scentCharacters = "Choose a scent character to publish.";
    }
    if (!input.occasions.length) {
      errors.occasions = "Choose an occasion to publish.";
    }
    if (!input.timesOfDay.length) {
      errors.timesOfDay = "Choose a time of day to publish.";
    }
  }
  return { input: Object.keys(errors).length ? undefined : input, errors };
}
