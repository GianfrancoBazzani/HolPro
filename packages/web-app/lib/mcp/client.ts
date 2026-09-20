import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { baseURL } from "@/lib/auth/portals";
import type { McpActor } from "./actor";
import { mintMcpToken } from "./token";
export type McpToolName =
  | "propose_calendar_changes"
  | "read_calendar_draft"
  | "publish_plan"
  | "list_plans"
  | "read_plan"
  | "search_coaches";
export type McpCallOptions = { signal?: AbortSignal; timeoutMs?: number };
// The assistant reaches the app's own MCP endpoint with a short-lived token.
// Every call opens and closes one client; the timeout covers connect and call.
export async function callMcp(
  actor: McpActor,
  name: McpToolName,
  args: Record<string, unknown>,
  options: McpCallOptions = {},
) {
  const timeout = options.timeoutMs ?? 30_000,
    signal = options.signal;
  const token = await mintMcpToken(actor.userId, actor.role);
  const url = new URL("/api/mcp", baseURL);
  const client = new Client({ name: "holpro-agent", version: "1.1.0" });
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
    },
  });
  try {
    await client.connect(transport, { signal, timeout });
    const result = await client.callTool(
      { name, arguments: args },
      { signal, timeout },
    );
    const text = result.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    if (result.isError) throw new Error(text || "MCP tool call failed.");
    return JSON.parse(text) as unknown;
  } finally {
    await client.close();
  }
}
