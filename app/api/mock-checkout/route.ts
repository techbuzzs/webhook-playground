import { NextRequest, NextResponse } from "next/server";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { resolveMockCheckout } from "@/lib/billing";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { user, profile } = await getUserAndProfile();
    if (!user || !profile) return apiError("Sign in required", 401, "AUTH_REQUIRED");
    ensureActive(profile);
    const body = await request.json().catch(() => ({}));
    const result = resolveMockCheckout(typeof body.code === "string" ? body.code : "");
    if (!result.ok) {
      const status = result.reason === "declined" ? 402 : 400;
      return apiError(
        result.reason === "declined" ? "Demo payment declined" : "Invalid demo code",
        status,
        result.reason === "declined" ? "DEMO_DECLINED" : "INVALID_DEMO_CODE",
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin
      .from("profiles")
      .update({ tier: result.tier })
      .eq("id", user.id);
    if (updateError) throw updateError;
    const { error: eventError } = await admin.from("billing_events").insert({
      user_id: user.id,
      event_type: result.tier === "basic" ? "mock_downgrade" : "mock_upgrade",
      target_tier: result.tier,
      demo_code: body.code.trim().toLowerCase(),
    });
    if (eventError) throw eventError;
    return NextResponse.json({ tier: result.tier, message: "Demo entitlement updated" });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
