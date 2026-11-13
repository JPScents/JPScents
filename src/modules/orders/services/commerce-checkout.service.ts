import "server-only";

import {
  canStartPaystackPayment,
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
import {
  findStatusOrderPayment,
  issueCheckoutStatusToken,
} from "../repositories/order-status-access.repository";
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
  const previousAttempt = reserved.duplicate ? reserved.attempt : null;
  if (previousAttempt && previousAttempt.status !== "SUCCEEDED") {
    if (previousAttempt.initialiseStartedAt && previousAttempt.status !== "FAILED") {
      const outcome = await reconcileCommercePayment(
        previousAttempt.providerReference,
        previousAttempt.environment,
      );
      if (outcome === "UNAVAILABLE") {
        return { statusToken, checkoutUrl: null } as const;
      }
    }
    const retry = await retryFailedCommerceOrder(orderId, command);
    if ("restartCheckout" in retry) {
      return {
        statusToken,
        restartCheckout: true,
        message:
          "Your previous attempt failed. Review the current checkout details to start again.",
      } as const;
    }
    if ("error" in retry) {
      return { statusToken, error: retry.error } as const;
    }
    if ("staleQuote" in retry) {
      return { statusToken, staleQuote: retry.staleQuote } as const;
    }
  }

  const checkoutUrl = await openCommercePayment(
    orderId,
    command.environment,
    command.issuedQuote?.token,
  );
  return { statusToken, checkoutUrl } as const;
}

export async function resumeCommercePayment(
  statusToken: string | undefined,
  checkoutSession: string | null,
  quoteToken?: string,
) {
  const environment = canStartPaystackPayment();
  if (!environment || !checkoutSession) {
    return null;
  }
  const attempt = await findStatusOrderPayment(statusToken, undefined, checkoutSession);
  if (!attempt || attempt.environment !== environment) {
    return null;
  }
  if (
    attempt.initialiseStartedAt &&
    (await reconcileCommercePayment(attempt.providerReference, environment)) !== "PENDING"
  ) {
    return null;
  }
  return openCommercePayment(attempt.orderId, environment, quoteToken, attempt.id);
}

async function openCommercePayment(
  orderId: string,
  environment: CommerceCheckoutCommand["environment"],
  quoteToken?: string,
  resumeAttemptId?: string,
) {
  const initialisation = await prepareCommerceInitialisation(
    orderId,
    environment,
    quoteToken,
    resumeAttemptId,
  );
  if (!initialisation) {
    return null;
  }
  if ("checkoutUrl" in initialisation && initialisation.checkoutUrl) {
    return hostedCheckoutUrl(initialisation.checkoutUrl);
  }
  const { attempt, email } = initialisation;
  if (!attempt || !email) {
    return null;
  }
  const checkoutUrl = await initialisePaystackPayment({
    environment: attempt.environment,
    amountMinor: attempt.amountMinor,
    providerReference: attempt.providerReference,
    email,
  });
  const usable = await saveCommerceInitialisation(orderId, attempt.id, checkoutUrl);
  return usable ? checkoutUrl : null;
}
