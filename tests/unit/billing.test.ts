import { describe, expect, it } from "vitest";
import { resolveMockCheckout } from "@/lib/billing";

describe("mock checkout", () => {
  it("maps only allowlisted demo codes", () => {
    expect(resolveMockCheckout("DEMO-PLUS")).toEqual({ ok: true, tier: "plus" });
    expect(resolveMockCheckout("demo-pro")).toEqual({ ok: true, tier: "pro" });
    expect(resolveMockCheckout("demo-basic")).toEqual({ ok: true, tier: "basic" });
  });

  it("simulates a decline without accepting card-like data", () => {
    expect(resolveMockCheckout("demo-decline")).toEqual({ ok: false, reason: "declined" });
    expect(resolveMockCheckout("4242 4242 4242 4242")).toEqual({ ok: false, reason: "invalid" });
  });
});
