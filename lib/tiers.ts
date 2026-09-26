import type { Tier } from "@/lib/types";

export const TIER_MULTIPLIERS: Record<Tier, number> = {
  basic: 1,
  plus: 2,
  pro: 4,
  super_user: 8,
};

export const BASIC_LIMITS = {
  endpointLifetimeHours: 24,
  deliveriesPerEndpoint: 100,
  bodySizeBytes: 256 * 1024,
  concurrentEndpoints: 3,
  historyDays: 7,
} as const;

export type TierLimits = {
  endpointLifetimeHours: number;
  deliveriesPerEndpoint: number;
  bodySizeBytes: number;
  concurrentEndpoints: number;
  historyDays: number;
};

export function getTierLimits(tier: Tier): TierLimits {
  const multiplier = TIER_MULTIPLIERS[tier];
  return {
    endpointLifetimeHours: BASIC_LIMITS.endpointLifetimeHours * multiplier,
    deliveriesPerEndpoint: BASIC_LIMITS.deliveriesPerEndpoint * multiplier,
    bodySizeBytes: BASIC_LIMITS.bodySizeBytes * multiplier,
    concurrentEndpoints: BASIC_LIMITS.concurrentEndpoints * multiplier,
    historyDays: BASIC_LIMITS.historyDays * multiplier,
  };
}

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && value in TIER_MULTIPLIERS;
}
