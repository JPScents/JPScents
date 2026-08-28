import { HelpMeChoose } from "@/features/catalogue/HelpMeChoose";
import { hasAvailablePerfumes, parsePreferences, recommendPerfumes } from "@/features/catalogue/public-catalogue";

export const dynamic = "force-dynamic";

export default async function HelpMeChoosePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const preferences = parsePreferences(params);
  const submitted = params.results === "1";
  const [results, catalogueAvailable] = await Promise.all([
    submitted ? recommendPerfumes(preferences) : Promise.resolve(undefined),
    hasAvailablePerfumes(),
  ]);
  return <HelpMeChoose initial={preferences} submitted={submitted} results={results} catalogueAvailable={catalogueAvailable} />;
}
