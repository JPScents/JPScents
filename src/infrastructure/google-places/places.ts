import "server-only";

export type AddressSuggestion = { label: string; street: string };

export function isAddressAssistanceEnabled() {
  return (
    process.env.GOOGLE_PLACES_ADDRESS_ASSISTANCE === "true" &&
    Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim())
  );
}

export async function searchNigerianAddresses(input: string): Promise<AddressSuggestion[] | null> {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!isAddressAssistanceEnabled() || !key) {
    return null;
  }
  try {
    const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.types",
      },
      body: JSON.stringify({ input, includedRegionCodes: ["ng"], languageCode: "en" }),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      return null;
    }
    const result = await response.json();
    if (!Array.isArray(result?.suggestions)) {
      return [];
    }
    return result.suggestions.slice(0, 5).flatMap(
      (
        suggestion: {
          placePrediction?: {
            text?: { text?: unknown };
            structuredFormat?: { mainText?: { text?: unknown } };
            types?: unknown;
          };
        } | null,
      ) => {
        const prediction = suggestion?.placePrediction;
        const label = prediction?.text?.text;
        const street = prediction?.structuredFormat?.mainText?.text;
        const types = prediction?.types;
        return typeof label === "string" &&
          label.length > 0 &&
          label.length <= 300 &&
          typeof street === "string" &&
          street.length > 0 &&
          street.length <= 240 &&
          Array.isArray(types) &&
          types.some(
            (type) =>
              type === "street_address" ||
              type === "premise" ||
              type === "route" ||
              type === "subpremise",
          )
          ? [{ label, street }]
          : [];
      },
    );
  } catch {
    return null;
  }
}
