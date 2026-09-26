import { readFileSync } from "node:fs";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";

type OpenApiDocument = { openapi?: string; paths?: Record<string, Record<string, unknown>> };

describe("OpenAPI contract", () => {
  const source = readFileSync("openapi.yaml", "utf8");
  const document = load(source) as OpenApiDocument;

  it("is an OpenAPI 3.1 document", () => {
    expect(document.openapi).toBe("3.1.0");
    expect(document.paths).toBeTypeOf("object");
  });

  it.each([
    ["/api/hooks/{endpointSecret}", ["get", "post", "put", "patch", "delete"]],
    ["/api/endpoints", ["get", "post"]],
    ["/api/mock-checkout", ["post"]],
    ["/api/admin/users", ["get", "patch"]],
  ])("documents %s", (path, methods) => {
    expect(document.paths?.[path]).toBeDefined();
    for (const method of methods) expect(document.paths?.[path]?.[method]).toBeDefined();
  });
});
