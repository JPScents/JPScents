"use client";

import { useRef, useState, useTransition, type FormEvent } from "react";

import { siteConfig } from "@/config/site";

import { submitOrder } from "../actions/submit-order.action";
import { nigeriaLocations } from "../constants/nigeria-locations";
import type { CheckoutCart, CheckoutForm } from "../types";
import { isNigerianState } from "../validators/delivery-location.validator";

export function useCheckout(cart: CheckoutCart) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const submissionKey = useRef<string | null>(null);
  const submitting = useRef(false);
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
  const update = (field: keyof CheckoutForm, value: string) =>
    setForm((previous) => ({ ...previous, [field]: value }));
  const updateState = (deliveryState: string) =>
    setForm((previous) => ({ ...previous, deliveryState, deliveryCity: "", customCity: "" }));
  const cities = isNigerianState(form.deliveryState)
    ? nigeriaLocations[form.deliveryState]
    : undefined;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (submitting.current) {
      return;
    }
    submitting.current = true;
    submissionKey.current ??= crypto.randomUUID();
    const key = submissionKey.current;
    setMessage("");
    start(async () => {
      try {
        const result = await submitOrder(cart.items, form, key);
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
      } catch {
        setMessage("Unable to place this order. Please try again.");
      } finally {
        submitting.current = false;
      }
    });
  };
  return { form, errors, message, pending, cities, update, updateState, submit };
}
