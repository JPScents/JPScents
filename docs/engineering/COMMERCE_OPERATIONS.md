# Commerce deployment and recovery

The commerce branch uses the required `JPScents quality` check. Merging `main` deploys automatically. The release rehearsal and live activation follow ADR-0010. [Release evidence](../architecture/adr/0010-commerce-release-and-recovery-evidence.md)

## Isolated checkout

- Apply the reviewed forward migrations to an authorised isolated database before using the new Admin and checkout routes. All 37 delivery settings start disabled without fees. Set synthetic fees for test destinations in Admin Delivery.
- Set `COMMERCE_CHECKOUT_ACTIVE=true` to use commerce checkout. Set `COMMERCE_PAYMENTS_ENABLED=true` only in an environment approved for payment initiation. Leaving both unset keeps the legacy checkout available during the rollout.
- Configure `PAYSTACK_MODE=TEST` in isolated Preview and `PAYSTACK_MODE=LIVE` in Production. Use the corresponding `PAYSTACK_SECRET_KEY`, an HTTPS `PAYSTACK_RETURN_ORIGIN` matching that deployment, and a random server-only `COMMERCE_STATUS_SECRET`. Store values using the hosting provider's secret UI.
- Register `/api/paystack/webhook` with the relevant Paystack integration. Use `PAYSTACK_WEBHOOK_SECRET` and optionally `PAYSTACK_PREVIOUS_WEBHOOK_SECRET` during rotation. `PAYSTACK_ALLOW_TEST_LEGACY_WEBHOOK=true` allows test-only legacy signatures when the current signing header is absent. Use the current signing scheme for live payments. [Paystack webhook signing](https://paystack.com/docs/payments/webhooks/)
- The browser suite uses synthetic PostgreSQL, Supabase and Paystack fixtures. Record actual HTTPS provider setup, payment, webhook, refund and recovery evidence separately on the milestone PR.

## Scheduled recovery

Use the protected `POST /api/commerce/reconcile` path for the approved minute-level Vercel Schedule. Configure a random deployment-scoped `CRON_SECRET` of at least 16 characters. The route verifies the bearer before reading or writing data. Vercel supplies the deployment's secret with each path invocation. Confirm account capability, explicit hosting authorisation and isolated target configuration before enabling the schedule. Hobby has a 15-minute minimum. [Path authentication](https://vercel.com/docs/schedules/handle-runs#which-cron_secret-value-vercel-sends) · [Schedule limits](https://vercel.com/docs/schedules/limits)

The protected endpoint releases due reservations and processes bounded payment, webhook and refund work. Successful completion records an aggregate run result. Work claimed by an interrupted invocation becomes eligible again after the lease expires. Paystack verification applies financial effects only when the reference, environment, currency, amount and local attempt agree. For provider action on a refund, use the Paystack dashboard and keep the same refund reference. [Refund references and recovery](https://paystack.com/docs/payments/refunds/)

To pause new payment initiation, retain `COMMERCE_CHECKOUT_ACTIVE=true` and set `COMMERCE_PAYMENTS_ENABLED=false` on a compatible build. Keep provider verification, signing secrets, database access and reconciliation configured so existing attempts, late payments and refunds can finish. Rehearse this on populated synthetic data before Production activation.
