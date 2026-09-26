import { describe, expect, it } from "vitest";
import { canManageEndpoint, isAdmin } from "@/lib/access";

describe("authorization helpers", () => {
  it("allows only the account owner for claimed endpoints", () => {
    const endpoint = { user_id: "owner", anonymous_session_hash: null };
    expect(canManageEndpoint(endpoint, "owner", null)).toBe(true);
    expect(canManageEndpoint(endpoint, "other", null)).toBe(false);
  });

  it("uses the browser session only for anonymous endpoints", () => {
    const endpoint = { user_id: null, anonymous_session_hash: "session" };
    expect(canManageEndpoint(endpoint, null, "session")).toBe(true);
    expect(canManageEndpoint(endpoint, null, "other")).toBe(false);
  });

  it("does not grant disabled admins access", () => {
    expect(isAdmin({ role: "admin", disabled: false })).toBe(true);
    expect(isAdmin({ role: "admin", disabled: true })).toBe(false);
  });
});
