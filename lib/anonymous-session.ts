import { cookies } from "next/headers";
import { createSecret, hashSecret } from "@/lib/crypto";

export const ANONYMOUS_COOKIE = "wp_session";

export async function getAnonymousSession(create = false): Promise<{
  token: string | null;
  hash: string | null;
  isNew: boolean;
}> {
  const store = await cookies();
  const existing = store.get(ANONYMOUS_COOKIE)?.value ?? null;
  if (existing) return { token: existing, hash: hashSecret(existing), isNew: false };
  if (!create) return { token: null, hash: null, isNew: false };
  const token = createSecret(32);
  return { token, hash: hashSecret(token), isNew: true };
}

export function anonymousCookie(token: string) {
  return {
    name: ANONYMOUS_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}
