import type { RequestContext } from "@mastra/core/request-context";
import { assistantContext, type AssistantContext } from "../context";
export function requireRole(
  request: RequestContext | undefined,
  role: AssistantContext["role"],
) {
  const context = assistantContext(request);
  if (context.role !== role) throw new Error("forbidden");
  return context;
}
