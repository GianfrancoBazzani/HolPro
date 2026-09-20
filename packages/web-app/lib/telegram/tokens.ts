import { createHash, randomBytes } from "node:crypto";
export const validToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export function issueToken(now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(now.getTime() + 15 * 60_000),
  };
}
