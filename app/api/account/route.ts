import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE() {
  try {
    const user = await getUser();
    if (!user) return apiError("Sign in required", 401, "AUTH_REQUIRED");
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
