import type { Tier } from "@/lib/types";

export const MOCK_CHECKOUT_CODES = {
  "demo-basic": "basic",
  "demo-plus": "plus",
  "demo-pro": "pro",
} as const satisfies Record<string, Tier>;

export type MockCheckoutResult =
  | { ok: true; tier: Tier }
  | { ok: false; reason: "declined" | "invalid" };

export function resolveMockCheckout(code: string): MockCheckoutResult {
  const normalized = code.trim().toLowerCase();
  if (normalized === "demo-decline") return { ok: false, reason: "declined" };
  const tier = MOCK_CHECKOUT_CODES[normalized as keyof typeof MOCK_CHECKOUT_CODES];
  return tier ? { ok: true, tier } : { ok: false, reason: "invalid" };
}
