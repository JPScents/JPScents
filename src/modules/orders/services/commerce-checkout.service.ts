import "server-only";

import {
  hostedCheckoutUrl,
  initialisePaystackPayment,
  verifyPaystackPayment,
} from "@/infrastructure/paystack/client";

import {
  reserveCommerceOrder,
  retryFailedCommerceOrder,
} from "../repositories/commerce-order.repository";
import {
  applyVerifiedCommercePayment,
  prepareCommerceInitialisation,
  saveCommerceInitialisation,
} from "../repositories/commerce-payment.repository";
import { issueCheckoutStatusToken } from "../repositories/order-status-access.repository";
import type { CommerceCheckoutCommand } from "../types";

export async function reconcileCommercePayment(
  reference: string,
  environment: CommerceCheckoutCommand["environment"],
) {
  const verified = await verifyPaystackPayment(reference, environment);
  return verified ? applyVerifiedCommercePayment(reference, verified) : "UNAVAILABLE";
}

export async function beginCommerceCheckout(command: CommerceCheckoutCommand) {
  const reserved = await reserveCommerceOrder(command);
  if (!("order" in reserved)) {
    return reserved;
  }

  const orderId = reserved.order.id;
  const statusToken = await issueCheckoutStatusToken(orderId, command.sessionToken);
  if (!statusToken) {
    return { error: "This browser cannot access that order." } as const;
  }
  if (reserved.duplicate && reserved.attempt && reserved.attempt.status !== "SUCCEEDED") {
    await reconcileCommercePayment(
      reserved.attempt.providerReference,
      reserved.attempt.environment,
    );
    const retry = await retryFailedCommerceOrder(orderId, command);
    if ("restartCheckout" in retry) {
      return {
        statusToken,
        restartCheckout: true,
        message:
          "Your previous attempt failed. Review the current checkout details to start again.",
      } as const;
    }
  }

  const initialisation = await prepareCommerceInitialisation(orderId);
  if (!initialisation) {
    return { statusToken, processing: true } as const;
  }
  if ("checkoutUrl" in initialisation && initialisation.checkoutUrl) {
    return { statusToken, checkoutUrl: hostedCheckoutUrl(initialisation.checkoutUrl) } as const;
  }
  const { attempt, email } = initialisation;
  if (!attempt || !email || attempt.environment !== command.environment) {
    return { statusToken, processing: true } as const;
  }
  const checkoutUrl = await initialisePaystackPayment({
    environment: attempt.environment,
    amountMinor: attempt.amountMinor,
    providerReference: attempt.providerReference,
    email,
  });
  const usable = await saveCommerceInitialisation(orderId, attempt.id, checkoutUrl);
  return { statusToken, checkoutUrl: usable ? checkoutUrl : null } as const;
}
