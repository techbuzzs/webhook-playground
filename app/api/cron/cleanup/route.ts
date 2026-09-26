import { NextRequest, NextResponse } from "next/server";
import { apiError, serviceUnavailable } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return apiError("Unauthorized", 401, "UNAUTHORIZED");
  }
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("cleanup_expired_data");
    if (error) throw error;
    return NextResponse.json({ removed: data ?? 0 });
  } catch (error) {
    return serviceUnavailable(error);
  }
}
