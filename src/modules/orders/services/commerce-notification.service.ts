import "server-only";

import { createHash, createHmac } from "node:crypto";

import { sendResendEmail } from "@/infrastructure/email/resend";
import { getPaystackReturnOrigin } from "@/infrastructure/paystack/client";
import {
  claimDueNotifications,
  EMAIL_REPLAY_MS,
  finishNotification,
} from "@/modules/notifications/server";

import { prepareCommerceNotification } from "../repositories/order-notification.repository";

const MAX_AUTO_ATTEMPTS = 8;
type NotificationBatch = Awaited<ReturnType<typeof claimDueNotifications>>;
type ClaimedEmail = NotificationBatch["emails"][number];

function signingKey(version: string) {
  const current = process.env.COMMERCE_STATUS_KEY_VERSION ?? "1";
  const key =
    version === current
      ? process.env.COMMERCE_STATUS_SECRET
      : version === process.env.COMMERCE_PREVIOUS_STATUS_KEY_VERSION
        ? process.env.COMMERCE_PREVIOUS_STATUS_SECRET
        : undefined;
  return key && key.length >= 32 ? key : null;
}

function emailConfiguration(email: ClaimedEmail) {
  const sender = email.sender ?? process.env.RESEND_FROM?.trim();
  const origin = getPaystackReturnOrigin();
  const statusLinkBase = email.statusLinkBase ?? (origin && `${origin}/checkout/status/access`);
  const statusKeyVersion = email.statusKeyVersion ?? process.env.COMMERCE_STATUS_KEY_VERSION ?? "1";
  const key = signingKey(statusKeyVersion);
  if (
    !sender ||
    !/^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(sender) ||
    !statusLinkBase ||
    !/^[a-zA-Z0-9_-]{1,32}$/.test(statusKeyVersion) ||
    !key ||
    !process.env.RESEND_API_KEY?.startsWith("re_")
  ) {
    return null;
  }
  return { sender, statusLinkBase, statusKeyVersion, key };
}

async function sendClaimedNotification(
  email: ClaimedEmail,
  batch: Pick<NotificationBatch, "leaseId">,
) {
  const now = new Date();
  const firstAttemptAt = email.firstAttemptAt ?? now;
  const replayDeadline = firstAttemptAt.getTime() + EMAIL_REPLAY_MS;
  if (replayDeadline <= now.getTime()) {
    await finishNotification(email.id, batch.leaseId, { issue: "EMAIL_REPLAY_EXPIRED" }, now);
    return "EMAIL_REPLAY_EXPIRED" as const;
  }
  const config = emailConfiguration(email);
  if (!config) {
    const nextAttemptAt = new Date(now.getTime() + 15 * 60_000);
    await finishNotification(
      email.id,
      batch.leaseId,
      { issue: "EMAIL_CONFIGURATION", nextAttemptAt },
      now,
    );
    return "EMAIL_CONFIGURATION" as const;
  }

  const { key, ...snapshot } = config;
  const token = createHmac("sha256", key)
    .update(`order-email-status:${email.orderId}:${email.id}`)
    .digest("base64url");
  const statusTokenHash = createHash("sha256").update(token).digest("hex");
  if (email.statusTokenHash && email.statusTokenHash !== statusTokenHash) {
    await finishNotification(email.id, batch.leaseId, { issue: "EMAIL_PAYLOAD_MISMATCH" }, now);
    return "EMAIL_PAYLOAD_MISMATCH" as const;
  }
  if (
    !(await prepareCommerceNotification(
      { id: email.id, orderId: email.orderId, leaseId: batch.leaseId },
      { ...snapshot, firstAttemptAt, statusTokenHash },
      token,
    ))
  ) {
    return "EMAIL_CLAIM_LOST" as const;
  }

  const result = await sendResendEmail({
    id: email.id,
    from: snapshot.sender,
    to: email.recipient,
    subject: email.subject,
    text: `${email.message}${snapshot.statusLinkBase}#${token}`,
  });
  const completedAt = new Date();
  if (result.accepted) {
    await finishNotification(email.id, batch.leaseId, { messageId: result.messageId }, completedAt);
    return null;
  }
  const attempts = email.attempts + 1;
  const delay = Math.min(60, 2 ** Math.min(attempts, 6)) * 60_000;
  const nextAttemptAt = new Date(completedAt.getTime() + delay);
  const retryable = result.issue === "EMAIL_AMBIGUOUS" || result.issue === "EMAIL_RATE_LIMIT";
  await finishNotification(
    email.id,
    batch.leaseId,
    {
      issue: result.issue,
      nextAttemptAt:
        retryable && attempts < MAX_AUTO_ATTEMPTS && nextAttemptAt.getTime() < replayDeadline
          ? nextAttemptAt
          : undefined,
    },
    completedAt,
  );
  return result.issue;
}

export async function reconcileCommerceNotifications(take: number) {
  const batch = await claimDueNotifications(new Date(), take);
  const outcomes = await Promise.allSettled(
    batch.emails.map((email) => sendClaimedNotification(email, batch)),
  );
  return outcomes.map((outcome) =>
    outcome.status === "fulfilled" ? outcome.value : ("EMAIL_WORKER_FAILED" as const),
  );
}
