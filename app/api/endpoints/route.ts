import { NextRequest, NextResponse } from "next/server";
import { anonymousCookie, getAnonymousSession } from "@/lib/anonymous-session";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { createSecret } from "@/lib/crypto";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTierLimits } from "@/lib/tiers";
import type { Endpoint, Tier } from "@/lib/types";

export async function GET() {
  try {
    const [{ user, profile }, session] = await Promise.all([
      getUserAndProfile(),
      getAnonymousSession(false),
    ]);
    ensureActive(profile);
    const admin = createAdminClient();
    let query = admin.from("endpoints").select("*").order("created_at", { ascending: false });

    if (user && session.hash) {
      query = query.or(`user_id.eq.${user.id},anonymous_session_hash.eq.${session.hash}`);
    } else if (user) {
      query = query.eq("user_id", user.id);
    } else if (session.hash) {
      query = query.eq("anonymous_session_hash", session.hash).is("user_id", null);
    } else {
      return NextResponse.json({ endpoints: [], user: null, profile: null });
    }

    const { data, error } = await query;
    if (error) throw error;
    const account = user ? { id: user.id, email: user.email ?? null } : null;
    return NextResponse.json({ endpoints: data ?? [], user: account, profile });
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
      return apiError("Account is disabled", 403, "ACCOUNT_DISABLED");
    }
    return serviceUnavailable(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const [{ user, profile }, session] = await Promise.all([
      getUserAndProfile(),
      getAnonymousSession(true),
    ]);
    ensureActive(profile);
    const tier: Tier = profile?.tier ?? "basic";
    const limits = getTierLimits(tier);
    const admin = createAdminClient();
    const now = new Date();

    let countQuery = admin
      .from("endpoints")
      .select("id", { count: "exact", head: true })
      .gt("expires_at", now.toISOString());
    countQuery = user
      ? countQuery.eq("user_id", user.id)
      : countQuery.eq("anonymous_session_hash", session.hash!).is("user_id", null);
    const { count, error: countError } = await countQuery;
    if (countError) throw countError;
    if ((count ?? 0) >= limits.concurrentEndpoints) {
      return apiError("Active endpoint limit reached", 429, "ENDPOINT_LIMIT_REACHED");
    }

    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "Untitled endpoint";
    const expiresAt = new Date(now.getTime() + limits.endpointLifetimeHours * 3_600_000);
    const historyExpiresAt = new Date(now.getTime() + limits.historyDays * 86_400_000);
    const receiverToken = createSecret(24);
    const record = {
      user_id: user?.id ?? null,
      anonymous_session_hash: user ? null : session.hash,
      receiver_token: receiverToken,
      name: name || "Untitled endpoint",
      tier,
      request_limit: limits.deliveriesPerEndpoint,
      body_size_limit: limits.bodySizeBytes,
      expires_at: expiresAt.toISOString(),
      history_expires_at: historyExpiresAt.toISOString(),
    };
    const { data, error } = await admin.from("endpoints").insert(record).select("*").single();
    if (error) throw error;

    const endpoint = data as Endpoint;
    const response = NextResponse.json(
      { endpoint, webhookUrl: `${request.nextUrl.origin}/api/hooks/${receiverToken}` },
      { status: 201 },
    );
    if (session.isNew && session.token) {
      const cookie = anonymousCookie(session.token);
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "ACCOUNT_DISABLED") {
      return apiError("Account is disabled", 403, "ACCOUNT_DISABLED");
    }
    return serviceUnavailable(error);
  }
}
