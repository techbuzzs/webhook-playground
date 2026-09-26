import { NextResponse } from "next/server";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierLimits } from "@/lib/tiers";

export async function GET() {
  try {
    const { user, profile } = await getUserAndProfile();
    if (!user || !profile) return apiError("Sign in required", 401, "AUTH_REQUIRED");
    ensureActive(profile);
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());
    if (error) throw error;
    return NextResponse.json({
      tier: profile.tier,
      role: profile.role,
      limits: getTierLimits(profile.tier),
      usage: { activeEndpoints: count ?? 0 },
    });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
