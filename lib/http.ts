import { NextResponse } from "next/server";

export function apiError(message: string, status: number, code?: string) {
  return NextResponse.json({ error: message, code: code ?? "REQUEST_FAILED" }, { status });
}

export function serviceUnavailable(error: unknown) {
  console.error("Server configuration or database error", error);
  return apiError("Service temporarily unavailable", 503, "SERVICE_UNAVAILABLE");
}
