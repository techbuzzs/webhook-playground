import { NextResponse } from "next/server";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierLimits } from "@/lib/tiers";

export async function POST() {
  try {
    const [{ user, profile }, session] = await Promise.all([
      getUserAndProfile(),
      getAnonymousSession(false),
    ]);
    if (!user || !profile) return apiError("Sign in required", 401, "AUTH_REQUIRED");
    ensureActive(profile);
    if (!session.hash) return NextResponse.json({ claimed: 0 });

    const admin = createAdminClient();
    const limits = getTierLimits(profile.tier);
    const { count, error: countError } = await admin
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());
    if (countError) throw countError;

    const available = Math.max(0, limits.concurrentEndpoints - (count ?? 0));
    if (!available) return apiError("Active endpoint limit reached", 409, "ENDPOINT_LIMIT_REACHED");
    const { data: candidates, error: listError } = await admin
      .from("endpoints")
      .select("id")
      .is("user_id", null)
      .eq("anonymous_session_hash", session.hash)
      .order("created_at", { ascending: true })
      .limit(available);
    if (listError) throw listError;
    const ids = (candidates ?? []).map((item) => item.id);
    if (!ids.length) return NextResponse.json({ claimed: 0 });

    const { error } = await admin
      .from("endpoints")
      .update({ user_id: user.id, anonymous_session_hash: null })
      .in("id", ids);
    if (error) throw error;
    return NextResponse.json({ claimed: ids.length });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
      return apiError("Account is disabled", 403, "ACCOUNT_DISABLED");
    }
    return serviceUnavailable(error);
  }
}
