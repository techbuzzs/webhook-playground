import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getUserAndProfile(): Promise<{
  user: User | null;
  profile: Profile | null;
}> {
  const user = await getUser();
  if (!user) return { user: null, profile: null };
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { user, profile: (data as Profile | null) ?? null };
}

export function ensureActive(profile: Profile | null): void {
  if (profile?.disabled) throw new Error("ACCOUNT_DISABLED");
}
