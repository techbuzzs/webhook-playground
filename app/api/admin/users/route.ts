import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/access";
import { getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTier } from "@/lib/tiers";

export async function GET(request: NextRequest) {
  try {
    const { profile } = await getUserAndProfile();
    if (!isAdmin(profile)) return apiError("Admin access required", 403, "ADMIN_REQUIRED");
    const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
    const admin = createAdminClient();
    let query = admin
      .from("profiles")
      .select("id,email,github_login,tier,role,disabled,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (search) {
      const safe = search.replaceAll(/[,%()]/g, "");
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(safe);
      query = query.or(`${isUuid ? `id.eq.${safe},` : ""}email.ilike.%${safe}%,github_login.ilike.%${safe}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ users: data ?? [] });
  } catch (error) {
    return serviceUnavailable(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, profile } = await getUserAndProfile();
    if (!user || !isAdmin(profile)) return apiError("Admin access required", 403, "ADMIN_REQUIRED");
    const body = await request.json().catch(() => ({}));
    if (typeof body.userId !== "string") return apiError("userId is required", 400);
    if (body.userId === user.id && (body.disabled === true || (body.role && body.role !== "admin"))) {
      return apiError("Admins cannot disable or demote their own account", 400, "SELF_LOCKOUT_BLOCKED");
    }
    const update: Record<string, unknown> = {};
    if (body.tier !== undefined) {
      if (!isTier(body.tier)) return apiError("Invalid tier", 400);
      update.tier = body.tier;
    }
    if (body.role !== undefined) {
      if (body.role !== "user" && body.role !== "admin") return apiError("Invalid role", 400);
      update.role = body.role;
    }
    if (body.disabled !== undefined) {
      if (typeof body.disabled !== "boolean") return apiError("Invalid disabled value", 400);
      update.disabled = body.disabled;
    }
    if (!Object.keys(update).length) return apiError("No valid changes supplied", 400);

    const admin = createAdminClient();
    const { data: before, error: beforeError } = await admin
      .from("profiles")
      .select("tier,role,disabled")
      .eq("id", body.userId)
      .single();
    if (beforeError) throw beforeError;
    const { data, error } = await admin
      .from("profiles")
      .update(update)
      .eq("id", body.userId)
      .select("id,email,github_login,tier,role,disabled,created_at,updated_at")
      .single();
    if (error) throw error;
    const { error: auditError } = await admin.from("admin_audit_logs").insert({
      actor_user_id: user.id,
      target_user_id: body.userId,
      action: "profile_update",
      before_state: before,
      after_state: data,
    });
    if (auditError) throw auditError;
    return NextResponse.json({ user: data });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
