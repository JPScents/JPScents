# Commerce deployment and recovery

The commerce branch uses the required `JPScents quality` check. Merging the PR into `main` deploys automatically. The release rehearsal and live activation follow ADR-0010. [Release evidence](../architecture/adr/0010-commerce-release-and-recovery-evidence.md)

## Isolated checkout

- Apply the reviewed forward migrations to an authorised isolated database before using the new Admin and checkout routes. All 37 delivery settings start disabled without fees. Set synthetic fees for test destinations in Admin Delivery.
- Set `COMMERCE_CHECKOUT_ACTIVE=true` to use commerce checkout. Set `COMMERCE_PAYMENTS_ENABLED=true` only in an environment approved for payment initiation. Leaving both unset keeps the legacy checkout available during the rollout.
- Configure `PAYSTACK_MODE=TEST` in isolated Preview and `PAYSTACK_MODE=LIVE` in Production. Use the corresponding `PAYSTACK_SECRET_KEY`, an HTTPS `PAYSTACK_RETURN_ORIGIN` matching that deployment, and a random server-only `COMMERCE_STATUS_SECRET`. Store values using the hosting provider's secret UI.
- Register `/api/paystack/webhook` with the relevant Paystack integration. Use `PAYSTACK_WEBHOOK_SECRET` and optionally `PAYSTACK_PREVIOUS_WEBHOOK_SECRET` during rotation. `PAYSTACK_ALLOW_TEST_LEGACY_WEBHOOK=true` allows test-only legacy signatures when the current signing header is absent. Use the current signing scheme for live payments. [Paystack webhook signing](https://paystack.com/docs/payments/webhooks/)
- The browser suite uses disposable PostgreSQL and Supabase with synthetic Paystack, Google Places and Resend responses. Record actual HTTPS provider setup, payment, webhook, refund and recovery evidence on the milestone PR.
- The original checkout browser can reopen an existing Paystack session while the stock reservation and applicable quote are current. Once a provider request has started, preserve its reference and verify its outcome before retrying. Reservation expiry closes an attempt the app never sent to Paystack and restores its stock.

## Address suggestions and email

- Enable `GOOGLE_PLACES_ADDRESS_ASSISTANCE` after configuring the server-only `GOOGLE_PLACES_API_KEY` for Places API (New). Restrict the key to that API, set a quota and budget alert for the scoped environment, and limit `POST /api/commerce/address-suggestions` at the Vercel firewall. The route requests up to five Nigerian predictions. State, city and street remain editable, and delivery fees still come from Admin Delivery. [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies) · [Vercel rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- Configure `RESEND_API_KEY` and a verified sender address in `RESEND_FROM`. Use a separate scoped sender and controlled inboxes for Preview. Disable click tracking on both sending domains so the status capability goes directly to JPScents. Use the deployment's configured HTTPS return origin for links. Verify actual receipt and direct link navigation in each environment. [Verified sender domains](https://resend.com/docs/dashboard/domains/introduction)
- Email requests commit with the order event. Admin Operations displays provider acceptance and failures. It records an identical sender, body and status link across retries. When rotating `COMMERCE_STATUS_SECRET`, update `COMMERCE_STATUS_KEY_VERSION` and retain the outgoing pair in `COMMERCE_PREVIOUS_STATUS_KEY_VERSION` and `COMMERCE_PREVIOUS_STATUS_SECRET` until outstanding sends have either settled or passed the replay window.
- After an uncertain email reaches 23 hours from its first attempt, check Resend's record before contacting the buyer. Recovery within the window uses the same message identity. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)

## Scheduled recovery

Use the protected `POST /api/commerce/reconcile` path for the approved minute-level Vercel Schedule. Configure a random deployment-scoped `CRON_SECRET` of at least 16 characters. The route verifies the bearer before reading or writing data. Vercel supplies the deployment's secret with each path invocation. Confirm account capability, explicit hosting authorisation and isolated target configuration before enabling the schedule. Hobby has a 15-minute minimum. [Path authentication](https://vercel.com/docs/schedules/handle-runs#which-cron_secret-value-vercel-sends) · [Schedule limits](https://vercel.com/docs/schedules/limits)

The static schedule belongs under `schedules` in `vercel.json`. After the team can run a one-minute interval and the hosted setup is authorised, use this target and enable it on the isolated Preview branch. A new static schedule starts inactive on Preview and active in Production. [Static schedules](https://vercel.com/docs/schedules/configuration) · [Environment defaults](https://vercel.com/docs/schedules/concepts#static-schedules-and-deployments)

```json
{
  "schedules": {
    "commerce-reconciliation": {
      "schedule": "* * * * *",
      "path": "/api/commerce/reconcile",
      "requestMethod": "POST"
    }
  }
}
```

The protected endpoint releases due reservations and processes bounded payment, webhook, refund and email work. Admin Operations shows the last successful scheduled run, recent run counts and errors, and the oldest unresolved entries. Work claimed by an interrupted invocation becomes eligible again after the lease expires. Paystack verification applies financial effects only when the reference, environment, currency, amount and local attempt agree. For a failed or action-required refund, resolve it in Paystack using its existing reference, then select **Check provider** in Admin Operations. The check verifies the existing refund, and its amount stays reserved while the outcome is unresolved. [Refund references and recovery](https://paystack.com/docs/payments/refunds/)

To pause new payment initiation, retain `COMMERCE_CHECKOUT_ACTIVE=true` and set `COMMERCE_PAYMENTS_ENABLED=false` on a compatible build. Keep provider verification, signing secrets, database access and reconciliation configured so existing attempts, late payments and refunds can finish. Rehearse this on populated synthetic data before Production activation.

## Production sequence

1. Verify the isolated Preview's database, test-only merchant, signed webhook, Places, inbox and scheduled run on the candidate. Keep the database connection, webhook credentials and schedule secret scoped to that environment.
2. Before the human merges, prepare the approved Production recovery point and apply the committed forward migrations to the confirmed Production database. Verify the migration history and representative legacy orders. Leave Paystack initiation disabled until the deployed prerequisites pass.
3. Verify the automatic deployment from `main`, the production domain, Admin access, delivery settings and protected schedule. Confirm the merchant account's live channels, settlement and refund funding, the signed webhook and verified Resend sender, and the Places restriction and quota.
4. After explicit live-test approval, enable initiation and exercise the agreed purchase and refund on the deployed revision. Verify the status, allocation, receipt, refund and scheduled recovery. If initiation needs to pause, deploy the compatible recovery configuration above and leave in-flight work on the forward schema.
