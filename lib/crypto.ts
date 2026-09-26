import { createHash, randomBytes } from "node:crypto";

export function createSecret(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
