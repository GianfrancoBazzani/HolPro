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
    "Find coaches who accept new clients. Returns name, bio and specialties. Pass a short query with the user's goal or interest, or no query to list everyone.",
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
