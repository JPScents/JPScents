"use client";

import { useState, useTransition, type FormEvent } from "react";

import { parseNairaToMinor } from "@/modules/catalogue";
import { nigeriaRegions, type DeliverySetting, type NigerianDestination } from "@/modules/delivery";
import { isNairaMinor } from "@/shared/utils/naira-minor";

import { updateDeliverySettings } from "../_actions/save-delivery-settings.action";

type Draft = { enabled: boolean; fee: string };
type Feedback = { error?: string; status?: string };

function draftFor(setting: DeliverySetting): Draft {
  return {
    enabled: setting.enabled,
    fee: setting.feeMinor === null ? "" : (setting.feeMinor / 100).toFixed(2),
  };
}

function buildChanges(saved: DeliverySetting[], edits: Map<NigerianDestination, Draft>) {
  const changes: DeliverySetting[] = [];
  for (const original of saved) {
    const edit = edits.get(original.state);
    if (!edit) {
      continue;
    }
    const text = edit.fee.trim();
    const fee = text ? parseNairaToMinor(text) : null;
    if ((text || edit.enabled) && !isNairaMinor(fee)) {
      return { error: `Enter a valid NGN fee for ${original.state}.` } as const;
    }
    if (edit.enabled !== original.enabled || fee !== original.feeMinor) {
      changes.push({ ...original, enabled: edit.enabled, feeMinor: fee });
    }
  }
  return { changes } as const;
}

export function DeliverySettingsForm({ settings }: { settings: DeliverySetting[] }) {
  const [saved, setSaved] = useState(settings);
  const [edits, setEdits] = useState(new Map<NigerianDestination, Draft>());
  const [feedback, setFeedback] = useState<Feedback>({});
  const [pending, startTransition] = useTransition();

  function apply(states: readonly NigerianDestination[], patch: Partial<Draft>) {
    setFeedback({});
    setEdits((current) => {
      const next = new Map(current);
      for (const state of states) {
        const setting = saved.find((row) => row.state === state);
        if (setting) {
          next.set(state, { ...(current.get(state) ?? draftFor(setting)), ...patch });
        }
      }
      return next;
    });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = buildChanges(saved, edits);
    if (result.error) {
      setFeedback({ error: result.error });
      return;
    }
    if (!result.changes?.length) {
      setFeedback({ status: "No changes to save." });
      return;
    }
    const changes = result.changes;
    startTransition(async () => {
      setFeedback({});
      try {
        const response = await updateDeliverySettings(changes);
        if (!response.ok) {
          setFeedback({ error: response.message });
          return;
        }
        const updated = new Map(response.settings.map((row) => [row.state, row]));
        setSaved((current) => current.map((row) => updated.get(row.state) ?? row));
        setEdits(new Map());
        setFeedback({ status: "Delivery settings saved." });
      } catch {
        setFeedback({ error: "Delivery settings could not be saved. Please try again." });
      }
    });
  }

  if (!saved.length) {
    return (
      <p role="status" className="mt-6">
        Delivery destinations are unavailable.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-7 max-w-4xl space-y-5">
      <fieldset disabled={pending} className="space-y-5" aria-label="Delivery destinations">
        {Object.entries(nigeriaRegions).map(([region, states]) => (
          <fieldset key={region} className="border bg-jp-surface px-4 pb-4 lg:px-6">
            <legend className="px-2 text-sm font-semibold">{region}</legend>
            <div className="flex flex-wrap gap-4 py-3 text-sm">
              <button
                className="underline"
                type="button"
                onClick={() => apply(states, { enabled: true })}
              >
                Enable all <span className="sr-only">in {region}</span>
              </button>
              <button
                className="underline"
                type="button"
                onClick={() => apply(states, { enabled: false })}
              >
                Disable all <span className="sr-only">in {region}</span>
              </button>
            </div>
            <div className="divide-y">
              {saved
                .filter((setting) => states.some((state) => state === setting.state))
                .map((setting) => {
                  const draft = edits.get(setting.state) ?? draftFor(setting);
                  return (
                    <div
                      key={setting.state}
                      className="flex flex-wrap items-center justify-between gap-2 py-2"
                    >
                      <label className="flex items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.enabled}
                          onChange={(event) =>
                            apply([setting.state], { enabled: event.target.checked })
                          }
                        />
                        {setting.state}
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <span aria-hidden="true">₦</span>
                        <span className="sr-only">{setting.state} delivery fee (NGN)</span>
                        <input
                          inputMode="decimal"
                          className="h-10 w-28 border px-2"
                          value={draft.fee}
                          onChange={(event) => apply([setting.state], { fee: event.target.value })}
                        />
                      </label>
                    </div>
                  );
                })}
            </div>
          </fieldset>
        ))}
        <button
          className="border bg-jp-olive px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          type="submit"
        >
          {pending ? "Saving…" : "Save delivery settings"}
        </button>
      </fieldset>
      {feedback.error ? (
        <p role="alert" className="text-sm text-destructive">
          {feedback.error}
        </p>
      ) : null}
      {feedback.status ? (
        <p role="status" className="text-sm">
          {feedback.status}
        </p>
      ) : null}
    </form>
  );
}
