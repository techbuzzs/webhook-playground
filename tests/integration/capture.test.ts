import { describe, expect, it } from "vitest";
import { parseJsonBody, queryObject } from "@/lib/capture";

describe("capture normalization", () => {
  it("preserves repeated query parameters", () => {
    expect(queryObject(new URL("https://example.test/hook?tag=one&tag=two&empty="))).toEqual({
      tag: ["one", "two"],
      empty: "",
    });
  });

  it("parses valid JSON only for JSON content types", () => {
    expect(parseJsonBody('{"ok":true}', "application/json; charset=utf-8")).toEqual({ ok: true });
    expect(parseJsonBody("not-json", "application/json")).toBeNull();
    expect(parseJsonBody('{"ok":true}', "text/plain")).toBeNull();
  });
});
