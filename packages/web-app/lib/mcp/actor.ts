import type { AuthInfo } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { PortalKey } from "@/lib/auth/portals";
import { roleSchema } from "./schemas";
import type { McpScope } from "./token-scopes";
export type McpActor = { userId: string; role: PortalKey };
export class McpScopeError extends Error {
  constructor() {
    super("The token does not grant this operation.");
  }
}
const actorSchema = z.object({ userId: z.string().min(1), role: roleSchema });
export function requireScope(
  auth: AuthInfo | undefined,
  ...scopes: McpScope[]
): McpActor {
  const parsed = actorSchema.safeParse(auth?.extra);
  if (
    !auth ||
    !parsed.success ||
    scopes.some((scope) => !auth.scopes.includes(scope))
  )
    throw new McpScopeError();
  return parsed.data;
}
