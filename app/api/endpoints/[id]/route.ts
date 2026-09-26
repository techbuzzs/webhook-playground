import { NextRequest, NextResponse } from "next/server";
import { canManageEndpoint } from "@/lib/access";
import { getAnonymousSession } from "@/lib/anonymous-session";
import { ensureActive, getUserAndProfile } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Endpoint } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

async function ownedEndpoint(id: string) {
  const [{ user, profile }, session] = await Promise.all([
    getUserAndProfile(),
    getAnonymousSession(false),
  ]);
  ensureActive(profile);
  const admin = createAdminClient();
  const { data, error } = await admin.from("endpoints").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  const endpoint = data as Endpoint | null;
  if (!endpoint || !canManageEndpoint(endpoint, user?.id ?? null, session.hash)) return null;
  return { admin, endpoint };
}

export async function GET(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const owned = await ownedEndpoint(id);
    return owned ? NextResponse.json({ endpoint: owned.endpoint }) : apiError("Endpoint not found", 404);
  } catch (error) {
    return serviceUnavailable(error);
  }
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const owned = await ownedEndpoint(id);
    if (!owned) return apiError("Endpoint not found", 404);
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    if (!name) return apiError("A name is required", 400, "INVALID_NAME");
    const { data, error } = await owned.admin
      .from("endpoints")
      .update({ name })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ endpoint: data });
  } catch (error) {
    return serviceUnavailable(error);
  }
}

export async function DELETE(_: NextRequest, context: Context) {
  try {
    const { id } = await context.params;
    const owned = await ownedEndpoint(id);
    if (!owned) return apiError("Endpoint not found", 404);
    const { error } = await owned.admin.from("endpoints").delete().eq("id", id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
