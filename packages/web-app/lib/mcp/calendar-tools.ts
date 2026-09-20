import type { McpServer } from "@modelcontextprotocol/server";
import {
  submitCalendarDraft,
  readCalendarDraft,
} from "@/lib/calendar/draft-repository";
import { requireScope } from "./actor";
import { mcpResult } from "./result";
import {
  proposeCalendarChangesSchema,
  readCalendarDraftSchema,
} from "./schemas";
const messages = {
  denied: "Plan or engagement not found or not accessible.",
  failed: "Unable to complete the calendar draft operation.",
};
export function registerCalendarTools(server: McpServer) {
  server.registerTool(
    "propose_calendar_changes",
    {
      title: "Propose calendar changes",
      description:
        "Replace the pending calendar changeset for coach review. Read the client plan first and reuse its row ids. Nothing changes for the client until the coach approves the entire proposal in the dashboard.",
      inputSchema: proposeCalendarChangesSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
      },
    },
    (input, ctx) =>
      mcpResult(
        () =>
          submitCalendarDraft(
            requireScope(ctx.http?.authInfo, "plans:read", "plans:write"),
            input,
          ),
        messages,
      ),
  );
  server.registerTool(
    "read_calendar_draft",
    {
      title: "Read calendar draft",
      description:
        "Read the pending calendar changeset as its coach, including resolved target titles, or null when none exists.",
      inputSchema: readCalendarDraftSchema,
      annotations: { readOnlyHint: true },
    },
    (input, ctx) =>
      mcpResult(
        () =>
          readCalendarDraft(
            requireScope(ctx.http?.authInfo, "plans:write"),
            input.engagementId,
          ),
        messages,
      ),
  );
}
