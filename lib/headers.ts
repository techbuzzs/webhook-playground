export const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "proxy-authorization",
  "set-cookie",
  "x-api-key",
  "x-auth-token",
  "x-signature",
  "x-webhook-signature",
]);

export function isSensitiveHeader(name: string): boolean {
  const normalized = name.toLowerCase();
  return (
    SENSITIVE_HEADERS.has(normalized) ||
    normalized.includes("secret") ||
    normalized.endsWith("-token") ||
    normalized.endsWith("-signature")
  );
}

export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(headers).map(([name, value]) => [
      name,
      isSensitiveHeader(name) ? "••••••••" : value,
    ]),
  );
}
