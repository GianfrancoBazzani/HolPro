import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { assistantContext } from "../context";
import { requireRole } from "./context";
import {
  publishPlanSchema,
  listPlansSchema,
  readPlanSchema,
  planSummarySchema,
  readPlanResultSchema,
  publishResultSchema,
} from "@/lib/mcp/schemas";
import { callMcp } from "@/lib/mcp/client";
const summaries = z.array(planSummarySchema);
export const publishPlanDocument = createTool({
  id: "publishPlanDocument",
  description:
    "Send an HTML coaching plan or update as a draft for the coach to review in the dashboard. List plans before updating; new documents require a title.",
  inputSchema: publishPlanSchema,
  outputSchema: publishResultSchema,
  execute: async (input, { requestContext, abortSignal }) =>
    publishResultSchema.parse(
      await callMcp(
        requireRole(requestContext, "coach"),
        "publish_plan",
        input,
        { signal: abortSignal },
      ),
    ),
});
export const listPlanDocuments = createTool({
  id: "listPlanDocuments",
  description:
    "List approved and, for coaches, pending HTML plan documents accessible to the current user, optionally for one engagement.",
  inputSchema: listPlansSchema,
  outputSchema: summaries,
  execute: async (input, { requestContext, abortSignal }) =>
    summaries.parse(
      await callMcp(assistantContext(requestContext), "list_plans", input, {
        signal: abortSignal,
      }),
    ),
});
export const readPlanDocument = createTool({
  id: "readPlanDocument",
  description:
    "Read the current or numbered approved HTML version, or the pending draft with draft:true as its coach.",
  inputSchema: readPlanSchema,
  outputSchema: readPlanResultSchema,
  execute: async (input, { requestContext, abortSignal }) =>
    readPlanResultSchema.parse(
      await callMcp(assistantContext(requestContext), "read_plan", input, {
        signal: abortSignal,
      }),
    ),
});
