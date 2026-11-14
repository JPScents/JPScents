import Link from "next/link";

import { getCurrentAdmin } from "@/app/_server/admin-session";
import { siteConfig } from "@/config/site";
import { EMAIL_REPLAY_MS } from "@/modules/notifications/server";
import { getCommerceOperations } from "@/modules/orders/server";

import { ReconcileButton } from "./_components/ReconcileButton";

const stamp = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Africa/Lagos",
});

function label(value: string) {
  return value.toLowerCase().replaceAll("_", " ");
}

function age(value: Date, now: number) {
  const minutes = Math.max(0, Math.floor((now - value.getTime()) / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr`;
}

type Entry = {
  id: string;
  reference: string;
  status: string;
  issue: string | null;
  createdAt: Date;
  providerReference?: string;
  retry: boolean;
  details?: string;
};

function Backlog({
  title,
  kind,
  entries,
  now,
}: {
  title: string;
  kind: "payment" | "refund" | "email";
  entries: Entry[];
  now: number;
}) {
  return (
    <section className="border bg-jp-surface p-5">
      <h2 className="font-display text-3xl">{title}</h2>
      {entries.length ? (
        <ul className="mt-3 divide-y">
          {entries.slice(0, 10).map((entry) => (
            <li key={entry.id} className="grid gap-3 py-3 sm:grid-cols-[1fr_auto]">
              <div className="min-w-0 break-words">
                <Link href={siteConfig.routes.adminOrder(entry.reference)} className="underline">
                  {entry.reference}
                </Link>
                <p className="text-sm capitalize">
                  {label(entry.status)} · {age(entry.createdAt, now)} old
                </p>
                {entry.providerReference ? (
                  <p className="text-sm">{entry.providerReference}</p>
                ) : null}
                {entry.issue ? <p className="text-sm capitalize">{label(entry.issue)}</p> : null}
                {entry.details ? <p className="text-sm">{entry.details}</p> : null}
              </div>
              {entry.retry ? (
                <ReconcileButton
                  kind={kind}
                  id={entry.id}
                  label={kind === "email" ? "Retry delivery" : "Check provider"}
                />
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm">No unresolved entries.</p>
      )}
      {entries.length > 10 ? <p className="mt-3 text-sm">Showing the 10 oldest entries.</p> : null}
    </section>
  );
}

export default async function CommerceOperationsPage() {
  const operations = await getCommerceOperations(await getCurrentAdmin());
  const now = operations.checkedAt;
  const payments = operations.payments.map((entry) => ({
    ...entry,
    reference: entry.order.reference,
    retry: true,
  }));
  const refunds = operations.refunds.map((entry) => ({
    ...entry,
    reference: entry.paymentAttempt.order.reference,
    retry: true,
    details:
      entry.status === "FAILED" || entry.status === "NEEDS_ATTENTION"
        ? "Resolve this refund in Paystack using the existing reference, then check its status."
        : undefined,
  }));
  const emails = operations.notifications.map((entry) => {
    const replayable = entry.firstAttemptAt
      ? entry.firstAttemptAt.getTime() > now - EMAIL_REPLAY_MS &&
        ["EMAIL_REJECTED", "EMAIL_CONFIGURATION", "EMAIL_RATE_LIMIT", "EMAIL_AMBIGUOUS"].includes(
          entry.issue ?? "",
        )
      : entry.status === "PENDING";
    const details =
      entry.status === "NEEDS_ATTENTION" && !replayable
        ? "Check the Resend delivery record before contacting the buyer."
        : undefined;
    return {
      ...entry,
      status: `${entry.kind} · ${entry.status}`,
      reference: entry.order.reference,
      retry: replayable,
      details,
    };
  });

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Commerce operations</h1>
          <p className="mt-2 text-sm">
            {operations.lastScheduledSuccess
              ? `Last successful scheduled run ${stamp.format(operations.lastScheduledSuccess)} WAT`
              : "No successful scheduled run recorded."}
          </p>
        </div>
        <ReconcileButton kind="batch" label="Run recovery now" />
      </header>
      <Backlog title="Payments" kind="payment" entries={payments} now={now} />
      <Backlog title="Refunds" kind="refund" entries={refunds} now={now} />
      <Backlog title="Order emails" kind="email" entries={emails} now={now} />
      <section className="border bg-jp-surface p-5">
        <h2 className="font-display text-3xl">Recent runs</h2>
        {operations.runs.length ? (
          <ul className="mt-3 divide-y">
            {operations.runs.map((run) => (
              <li key={run.id} className="py-3 text-sm">
                <p>
                  <time dateTime={run.startedAt.toISOString()}>
                    {stamp.format(run.startedAt)} WAT
                  </time>
                  {" · "}
                  {run.trigger === "SCHEDULED" ? "Scheduled" : "Admin"}
                  {" · "}
                  {run.completedAt
                    ? run.errors
                      ? `${run.errors} issues`
                      : "Completed"
                    : "Incomplete"}
                </p>
                {run.completedAt ? (
                  <p className="mt-1">
                    {run.expired} released · {run.payments} payment checks · {run.refunds} refund
                    checks · {run.notifications} emails accepted
                  </p>
                ) : null}
                {run.errorCounts &&
                typeof run.errorCounts === "object" &&
                !Array.isArray(run.errorCounts) ? (
                  <ul className="mt-1">
                    {Object.entries(run.errorCounts).map(([issue, count]) =>
                      typeof count === "number" ? (
                        <li key={issue} className="capitalize">
                          {label(issue)} · {count}
                        </li>
                      ) : null,
                    )}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">No runs recorded.</p>
        )}
      </section>
    </section>
  );
}
