import { createTool } from "@mastra/core/tools";
import {
  searchCoachesSchema,
  searchCoachesResultSchema,
} from "@/lib/mcp/schemas";
import { callMcp } from "@/lib/mcp/client";
import { requireRole } from "./context";
export const searchCoaches = createTool({
  id: "searchCoaches",
  description:
    "List the specialists and coaches available in HolPro who accept new clients. Call immediately when the user asks for a specialist, coach or available professionals; no intake or saved goals are required. Returns name, bio and specialties. Use a specialty, name or interest the user already supplied as a short query, or omit the query for a generic request to list everyone.",
  inputSchema: searchCoachesSchema,
  outputSchema: searchCoachesResultSchema,
  execute: async (input, { requestContext, abortSignal }) =>
    searchCoachesResultSchema.parse(
      await callMcp(
        requireRole(requestContext, "coachee"),
        "search_coaches",
        input,
        { signal: abortSignal },
      ),
    ),
});
