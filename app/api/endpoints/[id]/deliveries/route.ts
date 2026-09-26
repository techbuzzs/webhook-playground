import { NextRequest, NextResponse } from "next/server";
import { canManageEndpoint } from "@/lib/access";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Endpoint } from "@/lib/types";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [{ user, profile }, session] = await Promise.all([
      getUserAndProfile(),
      getAnonymousSession(false),
    ]);
    ensureActive(profile);
    const admin = createAdminClient();
    const { data: endpointData, error: endpointError } = await admin
      .from("endpoints")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (endpointError) throw endpointError;
    const endpoint = endpointData as Endpoint | null;
    if (!endpoint || !canManageEndpoint(endpoint, user?.id ?? null, session.hash)) {
      return apiError("Endpoint not found", 404);
    }
    const { data, error } = await admin
      .from("deliveries")
      .select("*")
      .eq("endpoint_id", id)
      .order("received_at", { ascending: false })
      .limit(endpoint.request_limit);
    if (error) throw error;
    return NextResponse.json({ deliveries: data ?? [] });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
