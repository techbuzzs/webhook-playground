import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";

export async function GET() {
  const specification = await readFile(join(process.cwd(), "openapi.yaml"), "utf8");
  return new NextResponse(specification, {
    headers: { "Content-Type": "application/yaml; charset=utf-8", "Cache-Control": "public, max-age=300" },
  });
}
