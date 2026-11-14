import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Address assistance and privacy" };

export default function AddressAssistancePage() {
  return (
    <section className="mx-auto max-w-2xl space-y-5 px-5 py-14">
      <h1 className="font-display text-5xl">Address assistance and privacy</h1>
      <h2 className="font-display text-3xl">Terms of use</h2>
      <p>
        You can enter your delivery address yourself or request optional Google Maps suggestions.
        Use the suggestions to find your own delivery address and check the city, street and
        building number before placing your order. When using suggestions, the{" "}
        <a className="underline" href="https://maps.google.com/help/terms_maps/">
          Google Maps Additional Terms of Service
        </a>{" "}
        apply.
      </p>
      <h2 className="font-display text-3xl">Privacy</h2>
      <p>
        When you choose Find address suggestions, JPScents sends the address text and the selected
        state to Google to request matches. Google processes that text under the{" "}
        <a className="underline" href="https://policies.google.com/privacy">
          Google Privacy Policy
        </a>
        . JPScents uses the address you submit with your order to arrange delivery and provide order
        support. The list of suggestions stays on the checkout screen.
      </p>
      <Link href="/checkout" className="inline-block underline">
        Return to Checkout
      </Link>
    </section>
  );
}
