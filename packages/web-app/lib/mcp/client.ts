import {
  Client,
  StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { baseURL } from "@/lib/auth/portals";
import type { PlanActor } from "@/lib/plans/types";
import { mintMcpToken } from "./token";
export async function callPlanMcp(
  actor: PlanActor,
  name: "publish_plan" | "list_plans" | "read_plan",
  args: Record<string, unknown>,
  signal?: AbortSignal,
) {
  const token = await mintMcpToken(actor.userId, actor.role);
  const url = new URL("/api/mcp", baseURL);
  const client = new Client({ name: "holpro-agent", version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: { Authorization: `Bearer ${token}` },
      redirect: "error",
    },
  });
  try {
    await client.connect(transport, { signal, timeout: 30_000 });
    const result = await client.callTool(
      { name, arguments: args },
      { signal, timeout: 30_000 },
    );
    const text = result.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");
    if (result.isError) throw new Error(text || "Plan operation failed.");
    return JSON.parse(text) as unknown;
  } finally {
    await client.close();
  }
}
