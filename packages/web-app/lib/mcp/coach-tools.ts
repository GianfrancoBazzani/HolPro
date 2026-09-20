import type { McpServer } from "@modelcontextprotocol/server";
import { searchCoaches } from "@/lib/coaches/repository";
import { requireScope } from "./actor";
import { mcpResult } from "./result";
import { searchCoachesSchema } from "./schemas";
const messages = {
  denied: "Coach search is not available for this account.",
  failed: "Unable to search coaches.",
};
export function registerCoachTools(server: McpServer) {
  server.registerTool(
    "search_coaches",
    {
      title: "Search coaches",
      description:
        "List coaches who accept new clients, with name, bio and specialties. The optional query matches name, bio and specialties. At most 50 results.",
      inputSchema: searchCoachesSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      mcpResult(async () => {
        requireScope(ctx.http?.authInfo, "coaches:search");
        return { coaches: await searchCoaches(input.query) };
      }, messages),
  );
}
