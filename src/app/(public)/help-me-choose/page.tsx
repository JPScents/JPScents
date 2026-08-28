import { HelpMeChoose } from "@/features/catalogue/HelpMeChoose";
import { parsePreferences, recommendPerfumes } from "@/features/catalogue/public-catalogue";

export const dynamic = "force-dynamic";

export default async function HelpMeChoosePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const preferences = parsePreferences(params);
  const submitted = params.results === "1";
  return <HelpMeChoose initial={preferences} submitted={submitted} results={submitted ? await recommendPerfumes(preferences) : undefined} />;
}
