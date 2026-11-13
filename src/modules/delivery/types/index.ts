import type { NigerianDestination } from "../constants/nigeria-regions";

export type DeliverySetting = {
  state: NigerianDestination;
  enabled: boolean;
  feeMinor: number | null;
  version: number;
};

export type DeliverySettingsResult =
  { ok: true; settings: DeliverySetting[] } | { ok: false; message: string; conflict?: boolean };
