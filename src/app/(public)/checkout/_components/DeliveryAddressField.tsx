"use client";

import Link from "next/link";
import { useRef, useState } from "react";

type Suggestion = { label: string; street: string };

export function DeliveryAddressField({
  state,
  suggestionsEnabled,
  error,
  initial = "",
}: {
  state: string;
  suggestionsEnabled: boolean;
  error?: string;
  initial?: string;
}) {
  const [street, setStreet] = useState(initial);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [searchState, setSearchState] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function findAddress() {
    const query = street.trim();
    if (pending || query.length < 4 || query.length > 120 || !state) {
      return;
    }
    const request = new AbortController();
    activeRequest.current = request;
    setPending(true);
    setSearchState(state);
    setSuggestions([]);
    setMessage("");
    try {
      const response = await fetch("/api/commerce/address-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, state }),
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(5_000)]),
      });
      if (!response.ok) {
        throw new Error("Address suggestions unavailable.");
      }
      const { suggestions: matches } = (await response.json()) as { suggestions: Suggestion[] };
      if (request === activeRequest.current) {
        setSuggestions(matches);
        if (!matches.length) {
          setMessage("No matching addresses. You can continue with your own address.");
        }
      }
    } catch {
      if (request === activeRequest.current) {
        setMessage("Address suggestions are unavailable. You can continue with your own address.");
      }
    } finally {
      if (request === activeRequest.current) {
        activeRequest.current = null;
        setPending(false);
      }
    }
  }

  return (
    <div className="grid gap-2">
      <label className="grid gap-2 text-sm font-semibold">
        Street and building
        <input
          ref={input}
          name="deliveryAddress"
          autoComplete="address-line1"
          required
          maxLength={240}
          value={street}
          onChange={(event) => {
            activeRequest.current?.abort();
            activeRequest.current = null;
            setStreet(event.target.value);
            setSuggestions([]);
            setMessage("");
            setPending(false);
          }}
          className="h-11 border bg-jp-surface px-3 font-normal"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "error-deliveryAddress" : undefined}
        />
        {error ? (
          <span id="error-deliveryAddress" role="alert" className="text-destructive">
            {error}
          </span>
        ) : null}
      </label>
      {suggestionsEnabled ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <button
              className="underline disabled:opacity-50"
              type="button"
              disabled={pending || !state || street.trim().length < 4 || street.trim().length > 120}
              onClick={() => void findAddress()}
            >
              {pending ? "Finding addresses…" : "Find address suggestions"}
            </button>
            <Link href="/address-assistance" target="_blank" rel="noreferrer" className="underline">
              Address assistance and privacy
            </Link>
          </div>
          {searchState === state && message ? (
            <p role="status" className="text-sm">
              {message}
            </p>
          ) : null}
          {searchState === state && suggestions.length ? (
            <div className="border bg-white text-[#1f1f1f]">
              <ul aria-label="Address suggestions" className="divide-y">
                {suggestions.map((suggestion, index) => (
                  <li key={index}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-black/5 focus-visible:bg-black/5"
                      onClick={() => {
                        setStreet(suggestion.street);
                        setSuggestions([]);
                        setMessage("Check your street, building number and city before paying.");
                        input.current?.focus();
                      }}
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
              <p
                translate="no"
                className="whitespace-nowrap px-3 py-2 text-xs font-normal text-[#5e5e5e]"
              >
                Google Maps
              </p>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
