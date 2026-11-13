import { describe, expect, it } from "vitest";

import { parseDeliverySettings } from "@/modules/delivery/server";
import { nigerianDestinations } from "@/modules/delivery/constants/nigeria-regions";
import { nigeriaStates } from "@/modules/orders";
import { MAX_NAIRA_MINOR } from "@/shared/utils/naira-minor";

const setting = { state: "Lagos", enabled: true, feeMinor: 130_050, version: 0 };

describe("delivery settings request boundary", () => {
  it("covers each existing state and FCT exactly once across regions", () => {
    expect([...nigerianDestinations].sort()).toEqual([...nigeriaStates].sort());
    expect(new Set(nigerianDestinations).size).toBe(37);
  });

  it("permits explicit zero fees and absent fees on disabled destinations", () => {
    expect(
      parseDeliverySettings([
        { ...setting, feeMinor: 0 },
        { state: "FCT", enabled: false, feeMinor: null, version: 1 },
      ]),
    ).toEqual([
      { state: "FCT", enabled: false, feeMinor: null, version: 1 },
      { ...setting, feeMinor: 0 },
    ]);
  });

  it("rejects malformed amounts, missing fees, stale payload shapes and duplicate states", () => {
    for (const row of [
      { ...setting, feeMinor: 10.5 },
      { ...setting, feeMinor: MAX_NAIRA_MINOR + 1 },
      { ...setting, feeMinor: null },
      { ...setting, feeMinor: "1300" },
      { ...setting, state: "Other" },
      { ...setting, version: -1 },
      { ...setting, enabled: "yes" },
    ]) {
      expect(parseDeliverySettings([row])).toBeNull();
    }
    expect(parseDeliverySettings([setting, setting])).toBeNull();
  });
});
