import { NextRequest, NextResponse } from "next/server";
import { parseJsonBody, queryObject } from "@/lib/capture";
import { createAdminClient } from "@/lib/supabase/admin";

const HARD_BODY_LIMIT = 2 * 1024 * 1024;

function captureResponse(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}

async function capture(request: NextRequest, context: { params: Promise<{ secret: string }> }) {
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(length) && length > HARD_BODY_LIMIT) {
      return captureResponse({ error: "Request body is too large", code: "BODY_TOO_LARGE" }, 413);
    }
    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > HARD_BODY_LIMIT) {
      return captureResponse({ error: "Request body is too large", code: "BODY_TOO_LARGE" }, 413);
    }

    const { secret } = await context.params;
    const body = new TextDecoder().decode(buffer);
    const contentType = request.headers.get("content-type");
    const parsedJson = parseJsonBody(body, contentType);

    const headers = Object.fromEntries(request.headers.entries());
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("capture_delivery", {
      p_token: secret,
      p_method: request.method,
      p_path: request.nextUrl.pathname.replace(secret, "[endpoint]"),
      p_query: queryObject(request.nextUrl),
      p_headers: headers,
      p_body: body,
      p_parsed_json: parsedJson,
      p_content_type: contentType,
      p_body_size: buffer.byteLength,
    });
    if (error) throw error;

    if (data === "not_found" || data === "expired") {
      return captureResponse({ error: "Webhook endpoint not found", code: "NOT_FOUND" }, 404);
    }
    if (data === "too_large") return captureResponse({ error: "Request body is too large", code: "BODY_TOO_LARGE" }, 413);
    if (data === "limit_reached") return captureResponse({ error: "Delivery limit reached", code: "LIMIT_REACHED" }, 429);
    return captureResponse({ received: true }, 200);
  } catch (error) {
    console.error("Webhook capture failed", error);
    return captureResponse({ error: "Unable to capture request", code: "SERVICE_UNAVAILABLE" }, 503);
  }
}

export const GET = capture;
export const POST = capture;
export const PUT = capture;
export const PATCH = capture;
export const DELETE = capture;

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    },
  });
}
