"use client";
export default function PerfumesError({ reset }: { reset: () => void }) {
  return (
    <section>
      <h1 className="font-display text-4xl">Catalogue unavailable.</h1>
      <p className="mt-2 text-sm text-jp-text-secondary">Please try loading this page again.</p>
      <button className="mt-4 underline" onClick={reset} type="button">
        Try again
      </button>
    </section>
  );
}
