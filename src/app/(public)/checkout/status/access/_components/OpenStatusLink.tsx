"use client";

import { useEffect, useRef } from "react";

export function OpenStatusLink() {
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const token = window.location.hash.slice(1);
    window.history.replaceState(null, "", window.location.pathname);
    if (!input.current || !form.current) {
      return;
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      window.location.replace("/checkout/status");
      return;
    }
    input.current.value = token;
    form.current.submit();
  }, []);

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <h1 className="font-display text-4xl">Opening order status</h1>
      <p role="status" className="mt-4">
        Checking your status link…
      </p>
      <form ref={form} method="post" action="/checkout/status/session">
        <input ref={input} type="hidden" name="token" />
      </form>
    </main>
  );
}
