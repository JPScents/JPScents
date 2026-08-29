"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/shared/EmptyState";
import type { Occasion, ScentCharacter, TimeOfDay } from "@/db/generated/client";
import { siteConfig } from "@/config/site";
import { RecommendationCard } from "./RecommendationCard";
import { ScentCharacterSelect } from "./ScentCharacterSelect";
import type { PublicPerfumeCard } from "../../public-catalogue";
import { preferenceSummary } from "../../public-preferences";
type Props = {
  initial: { scentCharacters: ScentCharacter[]; occasions: Occasion[]; timeOfDay?: TimeOfDay };
  results?: Array<PublicPerfumeCard & { matchReason: string; score: number }>;
  submitted: boolean;
  catalogueAvailable?: boolean;
};
const occasions: Array<{ value: Occasion; label: string }> = [
  { value: "EVERYDAY", label: "Everyday" },
  { value: "WORK", label: "Work" },
  { value: "DATE_NIGHT", label: "Evening" },
  { value: "SPECIAL_OCCASION", label: "Special occasion" },
];
const scents: ScentCharacter[] = ["FRESH", "WARM", "SWEET", "WOODY"];
const times: Array<{ value?: TimeOfDay; label: string }> = [
  { value: "DAY", label: "Day" },
  { value: "NIGHT", label: "Night" },
  { value: undefined, label: "Either" },
];
function toggle<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}
export function HelpMeChoose({ initial, results, submitted, catalogueAvailable = true }: Props) {
  const router = useRouter();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [scentCharacters, setScentCharacters] = useState(initial.scentCharacters);
  const [occasionValues, setOccasions] = useState(initial.occasions);
  const [timeOfDay, setTime] = useState<TimeOfDay | undefined>(initial.timeOfDay);
  const summary = preferenceSummary({ scentCharacters, occasions: occasionValues, timeOfDay });
  useEffect(() => {
    if (submitted) resultsHeading.current?.focus();
  }, [submitted]);
  function submit() {
    const params = new URLSearchParams();
    if (scentCharacters.length) params.set("scent", scentCharacters.join(","));
    if (occasionValues.length) params.set("occasion", occasionValues.join(","));
    if (timeOfDay) params.set("time", timeOfDay);
    params.set("results", "1");
    router.push(`${siteConfig.routes.helpMeChoose}?${params.toString()}`);
  }
  if (!catalogueAvailable)
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-20">
        <h1 className="sr-only">Help me choose</h1>
        <EmptyState
          eyebrow="Scent guide unavailable"
          title="Recommendations will begin with the collection."
          description="JPScents has not published any available perfumes yet. The scent guide will be ready as soon as there is a collection to match."
        >
          <Link
            href={siteConfig.routes.home}
            className="border border-jp-text-primary px-5 py-3 text-sm font-semibold"
          >
            Return home
          </Link>
        </EmptyState>
      </section>
    );
  if (submitted)
    return (
      <section
        className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-20"
        aria-live="polite"
      >
        <p className="text-sm uppercase tracking-[0.18em] text-jp-text-secondary">Your matches</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              ref={resultsHeading}
              tabIndex={-1}
              className="max-w-3xl font-display text-5xl outline-none lg:text-7xl"
            >
              Perfumes chosen around your preferences.
            </h1>
            <p className="mt-4 text-sm text-jp-text-secondary">
              {summary.join(" · ") || "Your preferences"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push(siteConfig.routes.helpMeChoose)}
            className="border-b border-jp-text-primary pb-1 text-sm font-semibold"
          >
            Adjust preferences
          </button>
        </div>
        {results?.length ? (
          <div className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-3xl">Your available recommendations</h2>
              <p className="text-sm text-jp-text-secondary">{results.length} selected for you</p>
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.35fr_.85fr_.85fr]">
              {results.map((result, index) => (
                <RecommendationCard
                  key={result.id}
                  perfume={result}
                  reason={result.matchReason}
                  leading={index === 0}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-10 border bg-jp-surface p-8">
            <h2 className="font-display text-4xl">No exact match yet.</h2>
            <p className="mt-3 max-w-lg text-jp-text-secondary">
              Try broadening your preferences, or browse every perfume at your own pace.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push(siteConfig.routes.helpMeChoose)}
                className="bg-jp-text-primary px-5 py-3 text-sm text-jp-surface"
              >
                Adjust preferences
              </button>
              <Link href={siteConfig.routes.perfumes} className="border px-5 py-3 text-sm">
                Browse all perfumes
              </Link>
            </div>
          </div>
        )}
        <p className="mt-8 text-center text-xs text-jp-text-secondary">
          Only available perfumes are shown.
        </p>
      </section>
    );
  return (
    <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-20">
      <p className="text-sm uppercase tracking-[0.18em] text-jp-text-secondary">Help me choose</p>
      <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[.95] lg:text-7xl">
        Start with what feels familiar.
      </h1>
      <p className="mt-5 max-w-xl text-jp-text-secondary">
        Choose the options that sound most like you. We&apos;ll show available perfumes to explore.
      </p>
      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_20rem]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <fieldset>
            <legend className="font-display text-3xl">
              <span className="mr-3 text-sm font-sans text-jp-text-secondary lg:hidden">01</span>
              Scent character
            </legend>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {scents.map((value) => (
                <ScentCharacterSelect
                  key={value}
                  value={value}
                  selected={scentCharacters.includes(value)}
                  onToggle={(item) => setScentCharacters(toggle(scentCharacters, item))}
                />
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-10">
            <legend className="font-display text-3xl">
              <span className="mr-3 text-sm font-sans text-jp-text-secondary lg:hidden">02</span>
              Occasion
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {occasions.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  aria-pressed={occasionValues.includes(item.value)}
                  onClick={() => setOccasions(toggle(occasionValues, item.value))}
                  className={`border px-4 py-3 text-sm ${occasionValues.includes(item.value) ? "bg-jp-text-primary text-jp-surface" : "bg-jp-surface"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="mt-10">
            <legend className="font-display text-3xl">
              <span className="mr-3 text-sm font-sans text-jp-text-secondary lg:hidden">03</span>
              When will you wear it?
            </legend>
            <div className="mt-4 flex flex-wrap gap-2">
              {times.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  aria-pressed={timeOfDay === item.value}
                  onClick={() => setTime(item.value)}
                  className={`border px-4 py-3 text-sm ${timeOfDay === item.value ? "bg-jp-text-primary text-jp-surface" : "bg-jp-surface"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="submit"
            className="mt-10 w-full bg-jp-text-primary px-6 py-4 text-sm text-jp-surface sm:w-auto"
          >
            Recommend perfumes
          </button>
          <p className="mt-4 text-sm text-jp-text-secondary lg:hidden">
            You can adjust these preferences on the results page.
          </p>
        </form>
        <aside className="hidden h-fit border bg-jp-green-surface p-6 lg:block">
          <p className="text-sm uppercase tracking-[0.16em]">Your preferences</p>
          <p className="mt-5 font-display text-3xl">
            {summary.length ? summary.join(" · ") : "A considered starting point."}
          </p>
          <p className="mt-3 text-sm leading-6 text-jp-text-secondary">
            Your choices are only used to build this shareable shortlist.
          </p>
        </aside>
      </div>
    </section>
  );
}
