"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { TimeOfDay } from "@/db/generated/client";
import { siteConfig } from "@/config/site";
import type { HelpPreferences } from "../types";
import { preferenceSummary } from "../utils/preferences";

function toggle<T>(items: T[], value: T) {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}
export function useScentPreferences(initial: HelpPreferences, submitted: boolean) {
  const router = useRouter();
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const [scentCharacters, setScentCharacters] = useState(initial.scentCharacters);
  const [occasionValues, setOccasions] = useState(initial.occasions);
  const [timeOfDay, setTime] = useState<TimeOfDay | undefined>(initial.timeOfDay);
  const [validationError, setValidationError] = useState("");
  const summary = preferenceSummary({ scentCharacters, occasions: occasionValues, timeOfDay });
  useEffect(() => {
    if (submitted) {
      resultsHeading.current?.focus();
    }
  }, [submitted]);
  function submit() {
    if (!scentCharacters.length && !occasionValues.length && !timeOfDay) {
      setValidationError("Choose at least one preference to receive a useful recommendation.");
      return;
    }
    setValidationError("");
    const params = new URLSearchParams();
    if (scentCharacters.length) {
      params.set("scent", scentCharacters.join(","));
    }
    if (occasionValues.length) {
      params.set("occasion", occasionValues.join(","));
    }
    if (timeOfDay) {
      params.set("time", timeOfDay);
    }
    params.set("results", "1");
    router.push(`${siteConfig.routes.helpMeChoose}?${params.toString()}`);
  }
  return {
    router,
    resultsHeading,
    scentCharacters,
    setScentCharacters,
    occasionValues,
    setOccasions,
    timeOfDay,
    setTime,
    validationError,
    summary,
    submit,
    toggle,
  };
}
