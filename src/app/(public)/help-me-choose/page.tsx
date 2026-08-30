import {
  HelpMeChoose,
  hasAvailablePerfumes,
  parsePreferences,
  recommendPerfumes,
} from "@/features/catalogue";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Find my scent",
  description:
    "Share the scent character, occasion, and time you enjoy to narrow the available perfumes.",
  alternates: { canonical: siteConfig.routes.helpMeChoose },
};

export default async function HelpMeChoosePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const preferences = parsePreferences(params);
  const submitted = params.results === "1";
  const [results, catalogueAvailable] = await Promise.all([
    submitted ? recommendPerfumes(preferences) : Promise.resolve(undefined),
    hasAvailablePerfumes(),
  ]);
  return (
    <HelpMeChoose
      initial={preferences}
      submitted={submitted}
      results={results}
      catalogueAvailable={catalogueAvailable}
    />
  );
}
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
