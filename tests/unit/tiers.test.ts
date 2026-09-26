import { describe, expect, it } from "vitest";
import { getTierLimits } from "@/lib/tiers";

describe("tier limits", () => {
  it.each([
    ["basic", 1], ["plus", 2], ["pro", 4], ["super_user", 8],
  ] as const)("scales %s by %i", (tier, multiplier) => {
    const limits = getTierLimits(tier);
    expect(limits).toEqual({
      endpointLifetimeHours: 24 * multiplier,
      deliveriesPerEndpoint: 100 * multiplier,
      bodySizeBytes: 256 * 1024 * multiplier,
      concurrentEndpoints: 3 * multiplier,
      historyDays: 7 * multiplier,
    });
  });
});
