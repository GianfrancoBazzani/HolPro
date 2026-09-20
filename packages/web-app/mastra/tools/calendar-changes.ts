import { createTool } from "@mastra/core/tools";
import { requireRole } from "./context";
import { callMcp } from "@/lib/mcp/client";
import {
  proposeCalendarChangesSchema,
  readCalendarDraftSchema,
  calendarSubmitResultSchema,
  calendarDraftResultSchema,
} from "@/lib/mcp/schemas";
export const proposeCalendarChanges = createTool({
  id: "proposeCalendarChanges",
  description:
    "Propose calendar changes for coach approval in the dashboard. Call getClientPlan first and reuse real ids. Replaces any pending changeset; the client calendar remains unchanged until approval.",
  inputSchema: proposeCalendarChangesSchema,
  outputSchema: calendarSubmitResultSchema,
  execute: async (input, { requestContext, abortSignal }) =>
    calendarSubmitResultSchema.parse(
      await callMcp(
        requireRole(requestContext, "coach"),
        "propose_calendar_changes",
        input,
        { signal: abortSignal },
      ),
    ),
});
const draftResult = calendarDraftResultSchema.nullable();
export const readCalendarDraft = createTool({
  id: "readCalendarDraft",
  description:
    "Read the pending calendar changeset for the coach's client, or null if there is no proposal.",
  inputSchema: readCalendarDraftSchema,
  outputSchema: draftResult,
  execute: async (input, { requestContext, abortSignal }) =>
    draftResult.parse(
      await callMcp(
        requireRole(requestContext, "coach"),
        "read_calendar_draft",
        input,
        { signal: abortSignal },
      ),
    ),
});
