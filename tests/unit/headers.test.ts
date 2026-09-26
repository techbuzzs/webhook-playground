import { describe, expect, it } from "vitest";
import { isSensitiveHeader, maskHeaders } from "@/lib/headers";

describe("sensitive headers", () => {
  it.each(["Authorization", "cookie", "X-Api-Key", "stripe-signature", "client-secret"])("detects %s", (name) => {
    expect(isSensitiveHeader(name)).toBe(true);
  });

  it("masks secrets but preserves debugging headers", () => {
    expect(maskHeaders({ authorization: "Bearer secret", "content-type": "application/json" })).toEqual({
      authorization: "••••••••",
      "content-type": "application/json",
    });
  });
});
