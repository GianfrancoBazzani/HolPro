import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { assistantContext } from "../context";
import { requireRole } from "./context";
import {
  publishPlanSchema,
  listPlansSchema,
  readPlanSchema,
  planSummarySchema,
  planContentSchema,
  publishResultSchema,
} from "@/lib/mcp/schemas";
import { callMcp } from "@/lib/mcp/client";
const summaries = z.array(planSummarySchema);
export const publishPlanDocument = createTool({
  id: "publishPlanDocument",
  description:
    "Publish an HTML coaching plan or update a known document when the coach instructs you to publish. List plans before updating; new documents require a title.",
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
    "List published HTML plan documents accessible to the current user, optionally for one engagement.",
  inputSchema: listPlansSchema,
  outputSchema: summaries,
  execute: async (input, { requestContext, abortSignal }) =>
    summaries.parse(
      await callMcp(
        assistantContext(requestContext),
        "list_plans",
        input,
        { signal: abortSignal },
      ),
    ),
});
export const readPlanDocument = createTool({
  id: "readPlanDocument",
  description:
    "Read the current HTML or a numbered version of a published plan document.",
  inputSchema: readPlanSchema,
  outputSchema: planContentSchema,
  execute: async (input, { requestContext, abortSignal }) =>
    planContentSchema.parse(
      await callMcp(
        assistantContext(requestContext),
        "read_plan",
        input,
        { signal: abortSignal },
      ),
    ),
});
