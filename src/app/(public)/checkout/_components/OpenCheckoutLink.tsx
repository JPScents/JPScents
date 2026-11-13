"use client";

import { useEffect, useRef } from "react";

export function OpenCheckoutLink({
  target = "/checkout/status/session",
  fallback = "/checkout/status?link=unavailable",
  title = "Opening order status",
}: {
  target?: string;
  fallback?: string;
  title?: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!input.current || !form.current) {
      return;
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      window.location.replace(fallback);
      return;
    }
    input.current.value = token;
    form.current.submit();
  }, [fallback]);

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-4xl">{title}</h1>
      <p role="status" className="mt-4">
        Checking your link…
      </p>
      <form ref={form} method="post" action={target}>
        <input ref={input} type="hidden" name="token" />
      </form>
    </main>
  );
}
