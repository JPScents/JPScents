"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";
import Link from "next/link";

import { useCart } from "@/app/(public)/_cart/providers/CartProvider";
import { siteConfig } from "@/config/site";
import type { DeliverySetting } from "@/modules/delivery";
import { formatNairaFromMinor } from "@/shared/utils/format-naira";

import { prepareCheckoutSession, startPayment } from "../_actions/start-payment.action";

const fields = [
  {
    name: "customerName",
    label: "Full name",
    required: true,
    autoComplete: "name",
    maxLength: 120,
  },
  {
    name: "email",
    label: "Email",
    required: true,
    type: "email",
    autoComplete: "email",
    maxLength: 254,
  },
  {
    name: "whatsappNumber",
    label: "Phone number",
    required: true,
    type: "tel",
    autoComplete: "tel",
    maxLength: 32,
  },
  {
    name: "deliveryCity",
    label: "City or town",
    required: true,
    autoComplete: "address-level2",
    maxLength: 80,
  },
  {
    name: "deliveryAddress",
    label: "Street and building",
    required: true,
    autoComplete: "address-line1",
    maxLength: 240,
  },
  { name: "deliveryApartment", label: "Apartment", autoComplete: "address-line2", maxLength: 80 },
  { name: "deliveryLandmark", label: "Landmark", maxLength: 120 },
  { name: "deliveryPostcode", label: "Postcode", autoComplete: "postal-code", maxLength: 16 },
] as const;

type StateFee = { state: string; deliveryFeeMinor: number };
type UnitPrice = { perfumeVariantId: string; unitPriceMinor: number };
const SUBMISSION_KEY = "jpscents-commerce-submission";

function rememberSubmission(current: string | null, replace: boolean) {
  const next = current ?? crypto.randomUUID();
  try {
    const saved = replace ? next : (current ?? sessionStorage.getItem(SUBMISSION_KEY) ?? next);
    sessionStorage.setItem(SUBMISSION_KEY, saved);
    return saved;
  } catch {
    return next;
  }
}

function CheckoutField({ field, error }: { field: (typeof fields)[number]; error?: string }) {
  return (
    <label className="grid gap-2 text-sm font-semibold">
      {field.label}
      <input
        name={field.name}
        type={"type" in field ? field.type : "text"}
        autoComplete={"autoComplete" in field ? field.autoComplete : undefined}
        required={"required" in field && field.required}
        maxLength={field.maxLength}
        className="h-11 border bg-jp-surface px-3 font-normal"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `error-${field.name}` : undefined}
      />
      {error ? (
        <span id={`error-${field.name}`} role="alert" className="text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

function useCommerceCheckout(destinations: DeliverySetting[]) {
  const cart = useCart();
  const key = useRef<string | null>(null);
  const replaceKey = useRef(false);
  const submitting = useRef(false);
  const [state, setState] = useState("");
  const [updatedFee, setUpdatedFee] = useState<StateFee>();
  const [updatedPrices, setUpdatedPrices] = useState<UnitPrice[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [pending, startTransition] = useTransition();
  const fee =
    updatedFee?.state === state
      ? updatedFee.deliveryFeeMinor
      : destinations.find((destination) => destination.state === state)?.feeMinor;
  const priced = cart.lines
    .filter((line) => line.isValid)
    .map((line) => ({
      ...line,
      unitPriceMinor:
        updatedPrices.find((price) => price.perfumeVariantId === line.perfumeVariantId)
          ?.unitPriceMinor ??
        line.unitPriceMinor ??
        0,
    }));
  const subtotal = priced.reduce(
    (sum, line) => sum + line.unitPriceMinor * line.requestedQuantity,
    0,
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      submitting.current ||
      fee == null ||
      cart.hasInvalidLines ||
      cart.resolutionState !== "idle"
    ) {
      return;
    }
    const data = new FormData(event.currentTarget);
    const details = { ...Object.fromEntries(data), deliveryCountry: "NG", deliveryState: state };
    key.current = rememberSubmission(key.current, replaceKey.current);
    replaceKey.current = false;
    const submissionKey = key.current;
    const quote = {
      deliveryFeeMinor: fee,
      unitPrices: priced.map(({ perfumeVariantId, unitPriceMinor }) => ({
        perfumeVariantId,
        unitPriceMinor,
      })),
    };
    submitting.current = true;
    setMessage("");
    setErrors({});
    startTransition(async () => {
      try {
        await prepareCheckoutSession();
        const result = await startPayment(cart.items, details, quote, submissionKey);
        if ("errors" in result && result.errors) {
          setErrors(result.errors);
        } else if ("staleQuote" in result && result.staleQuote) {
          setUpdatedFee({ state, deliveryFeeMinor: result.staleQuote.deliveryFeeMinor });
          if (result.staleQuote.unitPrices) {
            setUpdatedPrices(result.staleQuote.unitPrices);
          }
          setMessage(
            "Prices or delivery changed. Review the updated total, then choose Pay with Paystack again.",
          );
        } else if ("checkoutUrl" in result && result.checkoutUrl) {
          setProcessing(true);
          window.location.assign(result.checkoutUrl);
        } else if ("processing" in result && result.processing) {
          setProcessing(true);
          setMessage("We’re checking this payment. Check its status before trying again.");
        } else if ("error" in result && result.error) {
          setProcessing(false);
          if ("restartCheckout" in result) {
            key.current = null;
            replaceKey.current = true;
            cart.refreshCart();
          }
          setMessage(result.error);
        }
      } catch {
        setMessage("We could not start payment. Please try again.");
      } finally {
        submitting.current = false;
      }
    });
  }

  return {
    cart,
    state,
    setState,
    fee,
    priced,
    subtotal,
    errors,
    message,
    processing,
    pending,
    submit,
  };
}

export function CommerceCheckoutForm({ destinations }: { destinations: DeliverySetting[] }) {
  const checkout = useCommerceCheckout(destinations);
  if (
    checkout.cart.resolutionState === "idle" &&
    (!checkout.cart.items.length || checkout.cart.hasInvalidLines)
  ) {
    return (
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-5xl">Checkout</h1>
        <p className="mt-4">Review your cart before paying.</p>
        <Link href={siteConfig.routes.cart} className="mt-3 inline-block underline">
          Return to Cart
        </Link>
      </section>
    );
  }

  if (checkout.cart.resolutionState === "error") {
    return (
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h1 className="font-display text-5xl">Checkout</h1>
        <p role="alert" className="mt-4">
          Cart availability could not be checked.
        </p>
        <button type="button" className="mt-3 underline" onClick={checkout.cart.refreshCart}>
          Retry availability check
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-public-container px-public-gutter-mobile py-14 lg:px-public-gutter-desktop">
      <h1 className="font-display text-5xl">Checkout</h1>
      {!destinations.length ? (
        <p className="mt-4" role="status">
          Delivery destinations are currently unavailable.
        </p>
      ) : null}
      <form onSubmit={checkout.submit} className="mt-7 grid gap-6 lg:grid-cols-2">
        <fieldset disabled={checkout.pending} className="grid gap-4 border bg-jp-surface p-5">
          <legend className="px-2 text-sm font-semibold">Contact and delivery</legend>
          <p className="text-sm">
            Delivery country <strong>Nigeria</strong>
          </p>
          <label className="grid gap-2 text-sm font-semibold">
            State or FCT
            <select
              required
              className="h-11 border px-3 font-normal"
              value={checkout.state}
              onChange={(event) => checkout.setState(event.target.value)}
            >
              <option value="">Choose your state</option>
              {destinations.map((row) => (
                <option key={row.state}>{row.state}</option>
              ))}
            </select>
            {checkout.errors.deliveryState ? (
              <span role="alert" className="text-destructive">
                {checkout.errors.deliveryState}
              </span>
            ) : null}
          </label>
          {fields.map((field) => (
            <CheckoutField key={field.name} field={field} error={checkout.errors[field.name]} />
          ))}
          <label className="grid gap-2 text-sm font-semibold">
            Delivery instructions
            <textarea name="orderNote" maxLength={500} className="border p-3 font-normal" />
          </label>
        </fieldset>
        <section className="h-fit border bg-jp-surface p-5" aria-label="Order summary">
          <h2 className="font-display text-3xl">Order summary</h2>
          <ul className="mt-4 divide-y">
            {checkout.priced.map((line) => (
              <li key={line.perfumeVariantId} className="flex justify-between gap-4 py-2 text-sm">
                <span>
                  {line.name} {line.sizeLabel} × {line.requestedQuantity}
                </span>
                <span>{formatNairaFromMinor(line.unitPriceMinor * line.requestedQuantity)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal</dt>
              <dd>{formatNairaFromMinor(checkout.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Delivery</dt>
              <dd>
                {checkout.fee == null ? "Select a state" : formatNairaFromMinor(checkout.fee)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 font-semibold">
              <dt>Total (NGN)</dt>
              <dd>
                {checkout.fee == null
                  ? "—"
                  : formatNairaFromMinor(checkout.subtotal + checkout.fee)}
              </dd>
            </div>
          </dl>
          {checkout.message ? (
            <p role={checkout.processing ? "status" : "alert"} className="mt-4 text-sm">
              {checkout.message}
            </p>
          ) : null}
          {checkout.processing ? (
            <Link href="/checkout/status" className="mt-3 inline-block underline">
              Check payment status
            </Link>
          ) : null}
          <button
            className="mt-5 w-full border bg-jp-olive p-3 font-semibold text-white disabled:opacity-50"
            disabled={
              checkout.pending || checkout.fee == null || checkout.cart.resolutionState !== "idle"
            }
            type="submit"
          >
            {checkout.pending ? "Preparing payment…" : "Pay with Paystack"}
          </button>
        </section>
      </form>
    </section>
  );
}
