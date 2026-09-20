import { PlanAccessError } from "@/lib/plans/types";
import { McpScopeError } from "./actor";
export type McpMessages = { denied: string; failed: string };
// One envelope for every tool: JSON text plus structured content on success,
// and a fixed English diagnostic on failure so backend errors never leak.
export async function mcpResult(
  action: () => Promise<unknown>,
  messages: McpMessages,
) {
  try {
    const data = await action();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(data) }],
      ...(data && typeof data === "object" && !Array.isArray(data)
        ? { structuredContent: data as Record<string, unknown> }
        : {}),
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text:
            error instanceof PlanAccessError || error instanceof McpScopeError
              ? messages.denied
              : messages.failed,
        },
      ],
    };
  }
}
