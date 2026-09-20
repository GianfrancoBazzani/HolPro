import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { loadUserWithRoles } from "@/lib/auth/repository";
import { isBlocked, roleOf } from "@/lib/auth/policy";
import type { PortalKey } from "@/lib/auth/portals";
import { roleSchema } from "./schemas";
import { mcpSecret } from "./secret";
import { scopesFor } from "./token-scopes";
const claimsSchema = z
  .object({
    sub: z.string().min(1),
    role: roleSchema,
    jti: z.string().min(1),
    iat: z.number().int(),
    exp: z.number().int(),
  })
  .refine((c) => c.exp > c.iat && c.exp - c.iat <= 3600);
async function currentRole(userId: string, requested?: PortalKey) {
  const user = await loadUserWithRoles(userId);
  if (!user || isBlocked(user)) return;
  return roleOf(user, requested);
}
export async function mintMcpToken(userId: string, requested?: PortalKey) {
  const key = mcpSecret(),
    role = await currentRole(userId, requested),
    now = Math.floor(Date.now() / 1000);
  if (!role) throw new Error("MCP caller is not authorized.");
  const claims = claimsSchema.parse({
    sub: userId,
    role,
    jti: randomUUID(),
    iat: now,
    exp: now + 3600,
  });
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience("holpro-mcp")
    .setIssuer("holpro")
    .sign(key);
}
export async function verifyMcpToken(
  token?: string,
): Promise<AuthInfo | undefined> {
  if (!token) return;
  try {
    const { payload } = await jwtVerify(token, mcpSecret(), {
      algorithms: ["HS256"],
      audience: "holpro-mcp",
      issuer: "holpro",
      requiredClaims: ["sub", "role", "jti", "iat", "exp"],
      maxTokenAge: 3600,
    });
    const claims = claimsSchema.parse(payload),
      role = await currentRole(claims.sub, claims.role);
    if (!role || role !== claims.role) return;
    return {
      token,
      clientId: "holpro-agent",
      scopes: scopesFor(role),
      expiresAt: claims.exp,
      extra: { userId: claims.sub, role },
    };
  } catch {
    return;
  }
}
