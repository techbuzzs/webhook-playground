import { NextRequest, NextResponse } from "next/server";
import { canManageEndpoint } from "@/lib/access";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Delivery, Endpoint } from "@/lib/types";

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const [{ user }, session] = await Promise.all([getUserAndProfile(), getAnonymousSession(false)]);
    const admin = createAdminClient();
    const { data, error } = await admin.from("deliveries").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    const delivery = data as Delivery | null;
    if (!delivery) return apiError("Delivery not found", 404);
    const { data: endpointData } = await admin
      .from("endpoints")
      .select("*")
      .eq("id", delivery.endpoint_id)
      .maybeSingle();
    const endpoint = endpointData as Endpoint | null;
    if (!endpoint || !canManageEndpoint(endpoint, user?.id ?? null, session.hash)) {
      return apiError("Delivery not found", 404);
    }
    return NextResponse.json({ delivery });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
