import type { Endpoint, Profile } from "@/lib/types";

export function canManageEndpoint(
  endpoint: Pick<Endpoint, "user_id" | "anonymous_session_hash">,
  userId: string | null,
  anonymousHash: string | null,
): boolean {
  if (endpoint.user_id) return endpoint.user_id === userId;
  return Boolean(anonymousHash && endpoint.anonymous_session_hash === anonymousHash);
}

export function isAdmin(profile: Pick<Profile, "role" | "disabled"> | null): boolean {
  return profile?.role === "admin" && !profile.disabled;
}
