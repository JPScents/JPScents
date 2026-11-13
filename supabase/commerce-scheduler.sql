-- Run as the Supabase database operator after the Prisma migrations.
-- Installation leaves a new job inactive until its Vault settings are ready.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS commerce_scheduler;
REVOKE ALL ON SCHEMA commerce_scheduler FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION commerce_scheduler.has_due_work(at_utc timestamp without time zone)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT
    EXISTS (
      SELECT FROM public."StockReservation"
      WHERE "status" = 'HELD' AND "expiresAt" <= at_utc
    ) OR EXISTS (
      SELECT FROM public."PaystackReceipt"
      WHERE "processedAt" IS NULL AND "nextCheckAt" <= at_utc
        AND ("leaseUntil" IS NULL OR "leaseUntil" <= at_utc)
    ) OR EXISTS (
      SELECT FROM public."PaymentAttempt"
      WHERE "status" IN ('INITIATING', 'PENDING', 'AMBIGUOUS', 'NEEDS_ATTENTION')
        AND ("status" <> 'INITIATING' OR "initialiseStartedAt" IS NOT NULL)
        AND "nextCheckAt" <= at_utc AND ("leaseUntil" IS NULL OR "leaseUntil" <= at_utc)
    ) OR EXISTS (
      SELECT FROM public."Refund"
      WHERE ("status" IN ('REQUESTED', 'AMBIGUOUS', 'PENDING', 'PROCESSING', 'NEEDS_ATTENTION')
          OR ("status" = 'FAILED' AND "operatorRecheck"))
        AND "nextCheckAt" <= at_utc AND ("leaseUntil" IS NULL OR "leaseUntil" <= at_utc)
    ) OR EXISTS (
      SELECT FROM public."OrderNotification"
      WHERE "status" = 'PENDING' AND "nextAttemptAt" <= at_utc
        AND ("leaseUntil" IS NULL OR "leaseUntil" <= at_utc)
    );
$$;

CREATE OR REPLACE FUNCTION commerce_scheduler.enqueue_due_run()
RETURNS bigint
LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  at_utc timestamp := timezone('UTC', statement_timestamp());
  target text;
  bearer text;
BEGIN
  IF extract(minute FROM at_utc) <> 0 AND NOT commerce_scheduler.has_due_work(at_utc) THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO target FROM vault.decrypted_secrets
  WHERE name = 'jpscents_commerce_reconcile_url';
  SELECT decrypted_secret INTO bearer FROM vault.decrypted_secrets
  WHERE name = 'jpscents_commerce_cron_secret';

  -- Only operator-owned HTTPS storefronts may receive the Vault bearer.
  IF target IS NULL OR target !~ '^https://(jpscents[.]shop|[a-z0-9-]+[.]netlify[.]app)/api/commerce/reconcile$'
    OR bearer IS NULL OR length(bearer) < 16 OR bearer ~ '[[:space:]]'
  THEN
    RAISE EXCEPTION 'Commerce scheduler Vault configuration is missing or invalid';
  END IF;

  RETURN net.http_post(
    url := target,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || bearer),
    timeout_milliseconds := 60000
  );
END;
$$;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA commerce_scheduler
FROM PUBLIC, anon, authenticated, service_role;

-- pg_net queues the Authorization header until delivery. The job owner retains access.
REVOKE ALL ON SCHEMA net FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE net.http_request_queue, net._http_response FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  job_id bigint;
BEGIN
  IF NOT EXISTS (SELECT FROM cron.job WHERE jobname = 'jpscents-commerce-reconcile') THEN
    job_id := cron.schedule(
      'jpscents-commerce-reconcile', '* * * * *', 'SELECT commerce_scheduler.enqueue_due_run()'
    );
    PERFORM cron.alter_job(job_id, active := false);
  END IF;

  IF NOT EXISTS (SELECT FROM cron.job WHERE jobname = 'jpscents-commerce-history-cleanup') THEN
    job_id := cron.schedule(
      'jpscents-commerce-history-cleanup', '17 3 * * *',
      $cleanup$
        DELETE FROM cron.job_run_details
        WHERE end_time < now() - interval '7 days'
          AND jobid IN (SELECT jobid FROM cron.job
                       WHERE jobname IN ('jpscents-commerce-reconcile', 'jpscents-commerce-history-cleanup'));
        DELETE FROM public."CommerceReconciliationRun"
        WHERE "startedAt" < timezone('UTC', now()) - interval '30 days';
      $cleanup$
    );
    PERFORM cron.alter_job(job_id, active := false);
  END IF;
END;
$$;

COMMIT;
