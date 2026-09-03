"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { siteConfig } from "@/config/site";

import { submitOrder } from "../actions/submit-order.action";
import {
  CUSTOM_CITY_MAX_LENGTH,
  nigeriaLocations,
  nigeriaStates,
  OTHER_CITY_VALUE,
} from "../constants/nigeria-locations";
import { isNigerianState } from "../utils/delivery-location.utils";
import { OrderSummary } from "./OrderSummary";

type CheckoutForm = {
  customerName: string;
  whatsappNumber: string;
  email: string;
  deliveryState: string;
  deliveryCity: string;
  customCity: string;
  deliveryAddress: string;
  orderNote: string;
};
export type CheckoutCart = {
  items: Array<{ perfumeVariantId: string; quantity: number }>;
  lines: Array<{
    perfumeVariantId: string;
    requestedQuantity: number;
    name?: string;
    sizeLabel?: string;
    unitPriceMinor?: number;
    lineAmountMinor: number;
    imageUrl?: string;
    isValid: boolean;
  }>;
  subtotalMinor: number;
  hasInvalidLines: boolean;
  clearCart: () => void;
};

function Fields({
  form,
  update,
  errors,
  fields,
}: {
  form: CheckoutForm;
  update: (field: keyof CheckoutForm, value: string) => void;
  errors: Record<string, string>;
  fields: [keyof CheckoutForm, string, string, string][];
}) {
  return (
    <>
      {fields.map(([key, label, placeholder, type]) => (
        <label key={key} className="grid gap-2 text-sm font-semibold">
          {label}
          {type === "textarea" ? (
            <textarea
              value={form[key]}
              onChange={(event) => update(key, event.target.value)}
              placeholder={placeholder}
              rows={key === "deliveryAddress" ? 3 : 2}
              className="border bg-jp-surface p-3 font-normal"
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
          ) : (
            <input
              value={form[key]}
              onChange={(event) => update(key, event.target.value)}
              placeholder={placeholder}
              type={type}
              inputMode={key === "whatsappNumber" ? "tel" : undefined}
              autoComplete={
                key === "customerName"
                  ? "name"
                  : key === "email"
                    ? "email"
                    : key === "whatsappNumber"
                      ? "tel"
                      : undefined
              }
              className="h-12 border bg-jp-surface px-3 font-normal"
              aria-invalid={Boolean(errors[key])}
              aria-describedby={errors[key] ? `${key}-error` : undefined}
            />
          )}
          {errors[key] ? (
            <span id={`${key}-error`} role="alert" className="font-normal text-destructive">
              {errors[key]}
            </span>
          ) : null}
        </label>
      ))}
    </>
  );
}

export function Checkout({ cart }: { cart: CheckoutCart }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [form, setForm] = useState<CheckoutForm>({
    customerName: "",
    whatsappNumber: "",
    email: "",
    deliveryState: "",
    deliveryCity: "",
    customCity: "",
    deliveryAddress: "",
    orderNote: "",
  });
  if (!cart.items.length || cart.hasInvalidLines)
    return (
      <section className="mx-auto max-w-public-container px-public-gutter-mobile py-16 lg:px-public-gutter-desktop">
        <h1 className="font-display text-5xl">Your cart needs attention.</h1>
        <p className="mt-4 text-jp-text-secondary">
          Checkout is available once your cart has available perfumes.
        </p>
        <Link
          className="mt-6 inline-block border px-5 py-3 text-sm font-semibold"
          href={siteConfig.routes.cart}
        >
          Return to Cart
        </Link>
      </section>
    );
  const resolved = {
    items: cart.lines
      .filter((line) => line.isValid)
      .map((line) => ({
        name: line.name ?? "Perfume",
        sizeLabel: line.sizeLabel ?? "",
        quantity: line.requestedQuantity,
        unitPriceMinor: line.unitPriceMinor ?? 0,
        lineTotalMinor: line.lineAmountMinor,
        imageUrl: line.imageUrl,
      })),
    subtotalMinor: cart.subtotalMinor,
  };
  const update = (field: keyof CheckoutForm, value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));
  const updateState = (deliveryState: string) =>
    setForm((previous) => ({ ...previous, deliveryState, deliveryCity: "", customCity: "" }));
  const cities = isNigerianState(form.deliveryState)
    ? nigeriaLocations[form.deliveryState]
    : undefined;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    start(async () => {
      const result = await submitOrder(cart.items, form, submissionKey);
      if ("errors" in result) {
        setErrors(result.errors ?? {});
        return;
      }
      if ("error" in result) {
        setErrors({});
        setMessage(result.error ?? "Unable to place this order.");
        return;
      }
      cart.clearCart();
      window.location.assign(siteConfig.routes.checkoutConfirmation);
    });
  };
  return (
    <section className="mx-auto max-w-public-container px-public-gutter-mobile py-12 lg:px-public-gutter-desktop lg:py-16">
      <div className="border-b pb-8 lg:flex lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-jp-olive">Checkout</p>
          <h1 className="mt-3 font-display text-6xl lg:text-7xl">Place your order</h1>
        </div>
        <p className="mt-4 max-w-md text-sm leading-6 text-jp-text-secondary">
          Payment isn’t taken online. Place your order to receive a reference, then continue on
          WhatsApp for payment and delivery.
        </p>
      </div>
      <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem]">
        <div className="space-y-10">
          <fieldset className="grid gap-5 border-t pt-6">
            <legend className="flex w-full items-center justify-between border-b pb-4 font-display text-3xl">
              Contact details{" "}
              <span className="font-sans text-xs tracking-[.14em] text-jp-olive">01</span>
            </legend>
            <div className="grid gap-5 lg:grid-cols-2">
              <Fields
                form={form}
                update={update}
                errors={errors}
                fields={[
                  ["customerName", "Full name", "Your name", "name"],
                  ["whatsappNumber", "WhatsApp number", "e.g. 0800 000 0000", "tel"],
                ]}
              />
              <div className="lg:col-span-2">
                <Fields
                  form={form}
                  update={update}
                  errors={errors}
                  fields={[["email", "Email (optional)", "you@example.com", "email"]]}
                />
              </div>
            </div>
          </fieldset>
          <fieldset className="grid gap-5 border-t pt-6">
            <legend className="flex w-full items-center justify-between border-b pb-4 font-display text-3xl">
              Delivery details{" "}
              <span className="font-sans text-xs tracking-[.14em] text-jp-olive">02</span>
            </legend>
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                State
                <select
                  value={form.deliveryState}
                  onChange={(event) => updateState(event.target.value)}
                  autoComplete="address-level1"
                  className="h-12 border bg-jp-surface px-3 font-normal"
                  aria-invalid={Boolean(errors.deliveryState)}
                  aria-describedby={errors.deliveryState ? "deliveryState-error" : undefined}
                >
                  <option value="">Choose your state</option>
                  {nigeriaStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
                {errors.deliveryState ? (
                  <span
                    id="deliveryState-error"
                    role="alert"
                    className="font-normal text-destructive"
                  >
                    {errors.deliveryState}
                  </span>
                ) : null}
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                City
                <select
                  value={form.deliveryCity}
                  onChange={(event) => update("deliveryCity", event.target.value)}
                  autoComplete="address-level2"
                  disabled={!cities}
                  className="h-12 border bg-jp-surface px-3 font-normal disabled:cursor-not-allowed disabled:opacity-50"
                  aria-invalid={Boolean(errors.deliveryCity)}
                  aria-describedby={errors.deliveryCity ? "deliveryCity-error" : undefined}
                >
                  <option value="">{cities ? "Choose your city" : "Choose a state first"}</option>
                  {cities?.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                  {cities ? <option value={OTHER_CITY_VALUE}>Other</option> : null}
                </select>
                {errors.deliveryCity ? (
                  <span
                    id="deliveryCity-error"
                    role="alert"
                    className="font-normal text-destructive"
                  >
                    {errors.deliveryCity}
                  </span>
                ) : null}
              </label>
            </div>
            {form.deliveryCity === OTHER_CITY_VALUE ? (
              <label className="grid gap-2 text-sm font-semibold">
                City name
                <input
                  value={form.customCity}
                  onChange={(event) => update("customCity", event.target.value)}
                  placeholder="Enter your city"
                  maxLength={CUSTOM_CITY_MAX_LENGTH}
                  autoComplete="address-level2"
                  className="h-12 border bg-jp-surface px-3 font-normal"
                  aria-invalid={Boolean(errors.customCity)}
                  aria-describedby={errors.customCity ? "customCity-error" : undefined}
                />
                <span className="text-xs font-normal text-jp-text-secondary">
                  Up to {CUSTOM_CITY_MAX_LENGTH} characters.
                </span>
                {errors.customCity ? (
                  <span id="customCity-error" role="alert" className="font-normal text-destructive">
                    {errors.customCity}
                  </span>
                ) : null}
              </label>
            ) : null}
            <Fields
              form={form}
              update={update}
              errors={errors}
              fields={[
                [
                  "deliveryAddress",
                  "Delivery address",
                  "Where should your order be delivered?",
                  "textarea",
                ],
                ["orderNote", "Order note (optional)", "Anything we should know?", "textarea"],
              ]}
            />
          </fieldset>
          {message ? (
            <p role="alert" className="text-sm text-destructive">
              {message}
            </p>
          ) : null}
          <button
            disabled={pending}
            className="h-14 w-full bg-jp-text-primary text-sm font-bold uppercase tracking-[.08em] text-jp-surface disabled:opacity-50"
          >
            {pending ? "Saving order…" : "Place order"}
          </button>
          <div className="flex justify-between gap-4 text-xs text-jp-text-secondary">
            <Link href={siteConfig.routes.cart}>← Return to Cart</Link>
            <span>No payment is taken online.</span>
          </div>
        </div>
        <OrderSummary order={resolved} />
      </form>
    </section>
  );
}
